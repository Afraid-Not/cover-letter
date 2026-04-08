"""FastAPI 백엔드 — 기존 src/ 모듈을 API로 래핑"""

import logging
import sys
from pathlib import Path

# src 모듈 임포트를 위해 프로젝트 루트를 path에 추가
sys.path.insert(0, str(Path(__file__).parent.parent))

import tempfile

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%H:%M:%S",
)

from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

load_dotenv(Path(__file__).parent.parent / ".env")

app = FastAPI(title="Cover Letter Generator API")

import os

_origins_env = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000")
_allowed_origins = [o.strip() for o in _origins_env.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Request/Response Models ──

class AnalyzeJobRequest(BaseModel):
    text: str

class GenerateRequest(BaseModel):
    question: str
    job_posting: str
    job_analysis: dict | None = None
    resume_id: int | None = None
    resume_text: str | None = None
    char_limit: int | None = None
    feedback: str | None = None
    previous_answer: str | None = None
    company_research: dict | None = None  # companies 테이블 row (frontend에서 project.companies로 전달)

class EvaluateRequest(BaseModel):
    question: str
    answer: str
    job_analysis: dict
    resume_structured: dict | None = None  # 후처리 보정용
    company_size: str | None = None        # companies.company_size

class SaveGenerationRequest(BaseModel):
    job_posting: str
    job_analysis: dict
    question: str
    mode: str = "general"
    resume_id: int | None = None
    answer: str
    evaluation: dict | None = None
    char_limit: int | None = None

class CreateProjectRequest(BaseModel):
    job_posting: str

class UpdateProjectRequest(BaseModel):
    resume_id: int | None = None
    question: str | None = None
    mode: str | None = None
    char_limit: int | None = None
    answer: str | None = None
    evaluation: dict | None = None
    job_posting: str | None = None
    job_analysis: dict | None = None
    company_research: dict | None = None

class CreateVersionRequest(BaseModel):
    answer: str
    evaluation: dict | None = None
    question: str | None = None
    mode: str | None = None
    char_limit: int | None = None
    resume_id: int | None = None
    job_analysis: dict | None = None
    is_regeneration: bool = False  # 재생성 여부

class ResumeRequest(BaseModel):
    source: str
    name: str | None = None

class ProfileRequest(BaseModel):
    name: str
    phone: str | None = None
    job_title: str | None = None
    job_seeker_status: str | None = None  # 신입 or 경력
    years_of_experience: int | None = None
    education_level: str | None = None
    education_major: str | None = None
    agreed_to_terms: bool = False


# ── Supabase 헬퍼 ──

def _get_sb(token: str | None = None):
    import os
    from supabase import create_client
    key = os.getenv("SUPABASE_KEY") if token else os.getenv("SUPABASE_SERVICE_ROLE_KEY", os.getenv("SUPABASE_KEY"))
    sb = create_client(os.getenv("SUPABASE_URL"), key)
    if token:
        sb.postgrest.auth(token)
    return sb


def _extract_token(request: Request) -> str | None:
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        return auth[7:]
    return None


def _get_user_id(token: str) -> str | None:
    import json, base64
    try:
        payload = token.split(".")[1]
        payload += "=" * (4 - len(payload) % 4)
        data = json.loads(base64.urlsafe_b64decode(payload))
        return data.get("sub")
    except Exception:
        return None


# ── 플랜 제한 ──

PLAN_LIMITS = {
    "free":       {"resumes": 1,  "generations": 3,  "regenerations": 0},
    "pro":        {"resumes": 10, "generations": -1, "regenerations": 5},   # -1 = unlimited
    "enterprise": {"resumes": -1, "generations": -1, "regenerations": -1},
}


def _get_user_plan(sb, user_id: str) -> str:
    try:
        result = sb.table("profiles").select("plan").eq("user_id", user_id).single().execute()
        return result.data.get("plan", "free") if result.data else "free"
    except Exception:
        return "free"


def _get_month_start() -> str:
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc)
    return datetime(now.year, now.month, 1, tzinfo=timezone.utc).isoformat()


def _count_monthly_usage(sb, user_id: str) -> dict:
    month_start = _get_month_start()
    try:
        gen_res = (
            sb.table("generations")
            .select("id", count="exact")
            .eq("user_id", user_id)
            .eq("is_regeneration", False)
            .filter("project_id", "not.is", "null")
            .gte("created_at", month_start)
            .execute()
        )
        regen_res = (
            sb.table("generations")
            .select("id", count="exact")
            .eq("user_id", user_id)
            .eq("is_regeneration", True)
            .filter("project_id", "not.is", "null")
            .gte("created_at", month_start)
            .execute()
        )
        return {"generations": gen_res.count or 0, "regenerations": regen_res.count or 0}
    except Exception:
        return {"generations": 0, "regenerations": 0}


def _count_resumes(sb, user_id: str) -> int:
    try:
        res = sb.table("resumes").select("id", count="exact").eq("user_id", user_id).execute()
        return res.count or 0
    except Exception:
        return 0


# ── Endpoints ──

@app.get("/api/check-email")
async def check_email(email: str):
    import httpx
    supabase_url = os.getenv("SUPABASE_URL", "")
    service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY", "")
    logging.info(f"[check-email] email={email} url={supabase_url}")
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.get(
                f"{supabase_url}/auth/v1/admin/users",
                headers={
                    "apikey": service_key,
                    "Authorization": f"Bearer {service_key}",
                },
                params={"filter": email.lower().strip()},
            )
            logging.info(f"[check-email] status={resp.status_code} body={resp.text[:300]}")
            if resp.status_code != 200:
                return {"available": True}
            users = resp.json().get("users", [])
            exists = any((u.get("email") or "").lower() == email.lower().strip() for u in users)
            return {"available": not exists}
    except Exception as e:
        logging.error(f"[check-email] error: {e}")
        return {"available": True}


@app.post("/api/analyze-job")
async def analyze_job(req: AnalyzeJobRequest):
    from src.analyzer import analyze_job_posting
    return analyze_job_posting(req.text)


@app.post("/api/generate")
async def generate(req: GenerateRequest, request: Request):
    # 플랜 한도 체크
    token = _extract_token(request)
    if token:
        gen_user_id = _get_user_id(token)
        if gen_user_id:
            sb_plan = _get_sb(token)
            plan = _get_user_plan(sb_plan, gen_user_id)
            limits = PLAN_LIMITS[plan]
            is_regen = bool(req.feedback and req.previous_answer)

            if is_regen:
                if limits["regenerations"] == 0:
                    raise HTTPException(status_code=403, detail="PLAN_LIMIT|현재 플랜에서는 재생성이 불가합니다.")
                elif limits["regenerations"] > 0:
                    monthly = _count_monthly_usage(sb_plan, gen_user_id)
                    if monthly["regenerations"] >= limits["regenerations"]:
                        raise HTTPException(status_code=403, detail="PLAN_LIMIT|이번 달 재생성 횟수를 초과했습니다.")
            else:
                if limits["generations"] > 0:
                    monthly = _count_monthly_usage(sb_plan, gen_user_id)
                    if monthly["generations"] >= limits["generations"]:
                        raise HTTPException(status_code=403, detail="PLAN_LIMIT|이번 달 자소서 생성 횟수를 초과했습니다.")

    from src.analyzer import analyze_job_posting, build_search_query
    from src.generator import generate_answer
    from src.parser import get_resume, process_resume
    from src.retriever import search_similar

    # 채용공고 분석 (프론트에서 전달된 job_analysis가 있으면 재분석 스킵)
    job_analysis = req.job_analysis if req.job_analysis else analyze_job_posting(req.job_posting)

    # 이력서 resolve
    if req.resume_id:
        resume_data = get_resume(req.resume_id)
        structured = resume_data["structured_data"]
        raw_text = resume_data.get("raw_text", "")
    elif req.resume_text:
        result = process_resume(req.resume_text)
        structured = result["structured"]
        raw_text = req.resume_text
    else:
        raise HTTPException(400, "resume_id 또는 resume_text가 필요합니다")

    # RAG 검색
    search_query = build_search_query(job_analysis, req.question)
    rag_results = search_similar(search_query, match_count=5)

    # 생성
    answer = generate_answer(
        question=req.question,
        job_analysis=job_analysis,
        resume_structured=structured,
        resume_raw_text=raw_text,
        rag_results=rag_results,
        char_limit=req.char_limit,
        feedback=req.feedback,
        previous_answer=req.previous_answer,
        company_research=req.company_research,
    )

    return {
        "answer": answer,
        "job_analysis": job_analysis,
        "rag_count": len(rag_results),
        "char_count": len(answer),
    }


@app.post("/api/evaluate")
async def evaluate(req: EvaluateRequest):
    from src.evaluator import evaluate_all, aggregate_feedback
    from src.scoring_tables import compute_score_adjustment

    result = await evaluate_all(req.question, req.answer, req.job_analysis)
    feedback = aggregate_feedback(result)

    score_adj = None
    if req.resume_structured:
        score_adj = compute_score_adjustment(
            req.resume_structured, req.company_size, req.job_analysis
        )
        adjusted = round(
            max(0.0, min(100.0, result["overall_pass_probability"] + score_adj["total"])), 1
        )
        result = {**result, "overall_pass_probability": adjusted}

    return {**result, "aggregated_feedback": feedback, "score_adjustment": score_adj}


@app.post("/api/evaluate/stream")
async def evaluate_stream_endpoint(req: EvaluateRequest):
    """9명 평가관 결과를 SSE로 실시간 스트리밍한다."""
    import json as json_lib

    from starlette.responses import StreamingResponse
    from src.evaluator import evaluate_stream as _eval_stream, aggregate_feedback, _summarize_results

    async def event_generator():
        from src.scoring_tables import compute_score_adjustment

        results_collected = []
        try:
            async for item in _eval_stream(req.question, req.answer, req.job_analysis):
                results_collected.append(item)
                payload = json_lib.dumps({
                    "type": "evaluator",
                    "index": len(results_collected),
                    "total": 9,
                    "group": item["meta"]["group"],
                    "background": item["meta"]["background_short"],
                    "result": item["result"],
                    "error": item["error"],
                }, ensure_ascii=False)
                yield f"data: {payload}\n\n"

            # 최종 종합 결과
            summary = _summarize_results(results_collected)
            feedback = aggregate_feedback(summary)

            score_adj = None
            if req.resume_structured:
                score_adj = compute_score_adjustment(
                    req.resume_structured, req.company_size, req.job_analysis
                )
                adjusted = round(
                    max(0.0, min(100.0, summary["overall_pass_probability"] + score_adj["total"])), 1
                )
                summary = {**summary, "overall_pass_probability": adjusted}

            final = json_lib.dumps({
                "type": "summary",
                **summary,
                "aggregated_feedback": feedback,
                "score_adjustment": score_adj,
            }, ensure_ascii=False)
            yield f"data: {final}\n\n"
        except Exception as e:
            err = json_lib.dumps({"type": "error", "message": str(e)}, ensure_ascii=False)
            yield f"data: {err}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@app.get("/api/resumes")
async def list_resumes(request: Request):
    from src.parser import list_resumes
    token = _extract_token(request)
    user_id = _get_user_id(token) if token else None
    try:
        return list_resumes(user_id=user_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"이력서 목록 조회 실패: {e}")


@app.post("/api/resumes")
async def add_resume(req: ResumeRequest, request: Request):
    from src.parser import process_resume
    token = _extract_token(request)
    user_id = _get_user_id(token) if token else None
    # 이력서 한도 체크
    if user_id:
        sb_check = _get_sb(token)
        plan = _get_user_plan(sb_check, user_id)
        limits = PLAN_LIMITS[plan]
        if limits["resumes"] > 0:
            count = _count_resumes(sb_check, user_id)
            if count >= limits["resumes"]:
                raise HTTPException(status_code=403, detail="PLAN_LIMIT|이력서 등록 한도에 도달했습니다.")
    try:
        return process_resume(req.source, req.name, user_id=user_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"이력서 등록 실패: {e}")


@app.post("/api/resumes/upload")
async def upload_resume(request: Request, file: UploadFile = File(...), name: str = Form("")):
    """PDF/txt/md 파일 업로드로 이력서 등록"""
    from src.parser import process_resume
    token = _extract_token(request)
    user_id = _get_user_id(token) if token else None
    # 이력서 한도 체크
    if user_id:
        sb_check = _get_sb(token)
        plan = _get_user_plan(sb_check, user_id)
        limits = PLAN_LIMITS[plan]
        if limits["resumes"] > 0:
            count = _count_resumes(sb_check, user_id)
            if count >= limits["resumes"]:
                raise HTTPException(status_code=403, detail="PLAN_LIMIT|이력서 등록 한도에 도달했습니다.")

    suffix = file.filename.rsplit(".", 1)[-1].lower() if file.filename else "txt"
    content = await file.read()

    try:
        if suffix == "pdf":
            with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
                tmp.write(content)
                tmp_path = tmp.name
            result = process_resume(tmp_path, name or file.filename, user_id=user_id)
            import os
            os.unlink(tmp_path)
        else:
            text = content.decode("utf-8")
            result = process_resume(text, name or file.filename, user_id=user_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"이력서 업로드 실패: {e}")

    return result


@app.get("/api/resumes/{resume_id}")
async def get_resume(resume_id: int):
    from src.parser import get_resume
    try:
        return get_resume(resume_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"이력서 조회 실패: {e}")


@app.delete("/api/resumes/{resume_id}")
async def delete_resume(resume_id: int):
    from src.parser import delete_resume
    try:
        delete_resume(resume_id)
        return {"ok": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"이력서 삭제 실패: {e}")


@app.post("/api/parse-image")
async def parse_image(file: UploadFile = File(...)):
    """이미지/PDF에서 Claude Haiku 비전으로 텍스트를 추출한다."""
    import base64
    import os

    content = await file.read()
    suffix = file.filename.rsplit(".", 1)[-1].lower() if file.filename else "png"

    # PDF면 먼저 이미지로 변환
    if suffix == "pdf":
        from src.parser import _read_pdf
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
            tmp.write(content)
            tmp_path = tmp.name
        text = _read_pdf(Path(tmp_path))
        os.unlink(tmp_path)
        return {"text": text}

    # 이미지 → GPT-4o 비전으로 텍스트 추출
    b64 = base64.b64encode(content).decode("utf-8")
    mime = f"image/{suffix}" if suffix in ("png", "jpg", "jpeg", "webp", "gif") else "image/png"

    import anthropic
    client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
    response = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=4096,
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {"type": "base64", "media_type": mime, "data": b64},
                    },
                    {"type": "text", "text": "이 채용공고 이미지에 있는 모든 텍스트를 빠짐없이 원문 그대로 추출해주세요."},
                ],
            }
        ],
    )
    return {"text": response.content[0].text}


# ── 생성 이력 ──

@app.get("/api/generations")
async def list_generations():
    """생성 이력 목록 조회 (최근 순)."""
    import os
    from supabase import create_client
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).parent.parent / ".env")
    sb = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))
    try:
        result = sb.table("generations").select(
            "id, question, mode, char_limit, created_at, job_analysis->company, job_analysis->position"
        ).order("created_at", desc=True).limit(50).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"생성 이력 조회 실패: {e}")
    return result.data


@app.post("/api/generations")
async def save_generation(req: SaveGenerationRequest):
    """생성 결과 + 평가를 DB에 저장한다."""
    import os
    from supabase import create_client
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).parent.parent / ".env")
    sb = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))
    try:
        result = sb.table("generations").insert({
            "job_posting": req.job_posting,
            "job_analysis": req.job_analysis,
            "question": req.question,
            "mode": req.mode,
            "resume_id": req.resume_id,
            "answer": req.answer,
            "evaluation": req.evaluation,
            "char_limit": req.char_limit,
        }).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"생성 이력 저장 실패: {e}")
    return result.data[0]


@app.get("/api/generations/{gen_id}")
async def get_generation(gen_id: int):
    """생성 이력 상세 조회."""
    import os
    from supabase import create_client
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).parent.parent / ".env")
    sb = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))
    try:
        result = sb.table("generations").select("*").eq("id", gen_id).single().execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"생성 이력 상세 조회 실패: {e}")
    return result.data


# ── 프로젝트 (자소서 카드) ──

@app.post("/api/projects")
async def create_project(req: CreateProjectRequest, request: Request):
    """채용공고로 프로젝트 생성 (채용공고 분석만 수행, 회사 조사는 별도 엔드포인트)."""
    token = _extract_token(request)
    user_id = _get_user_id(token) if token else None

    from src.analyzer import analyze_job_posting
    job_analysis = analyze_job_posting(req.job_posting)

    sb = _get_sb(token)
    insert_data = {
        "job_posting": req.job_posting,
        "job_analysis": job_analysis,
        "question": "",
        "mode": "general",
        "answer": "",
    }
    if user_id:
        insert_data["user_id"] = user_id

    try:
        result = sb.table("generations").insert(insert_data).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DB insert failed: {e}")
    return result.data[0]


@app.post("/api/projects/{project_id}/research")
async def research_project_company(project_id: int, request: Request):
    """회사 정보를 캐시(companies 테이블) 또는 웹서치로 조회해 프로젝트에 연결한다."""
    token = _extract_token(request)
    sb = _get_sb(token)

    project_result = sb.table("generations").select("job_analysis, company_id").eq("id", project_id).single().execute()
    if not project_result.data:
        raise HTTPException(status_code=404, detail="프로젝트를 찾을 수 없습니다")

    company = project_result.data.get("job_analysis", {}).get("company", "")

    from src.researcher import get_or_research_company
    company_row = get_or_research_company(company)
    logging.getLogger(__name__).info("[research] company='%s' row=%s", company, company_row)

    if company_row:
        try:
            sb.table("generations").update({"company_id": company_row["id"]}).eq("id", project_id).execute()
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"DB update failed: {e}")

    # 최신 프로젝트 데이터를 companies 조인해서 반환
    result = sb.table("generations").select("*, companies(*)").eq("id", project_id).single().execute()
    return result.data


@app.get("/api/projects")
async def list_projects(request: Request):
    """프로젝트 목록 조회 (루트 프로젝트만)."""
    token = _extract_token(request)
    sb = _get_sb(token)
    try:
        result = sb.table("generations").select(
            "id, question, mode, char_limit, created_at, job_analysis, evaluation"
        ).is_("project_id", "null").order("created_at", desc=True).limit(50).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DB query failed: {e}")
    return result.data


@app.get("/api/projects/{project_id}")
async def get_project(project_id: int, request: Request):
    """프로젝트 상세 조회 (버전 목록 포함)."""
    token = _extract_token(request)
    sb = _get_sb(token)
    try:
        result = sb.table("generations").select("*, companies(*)").eq("id", project_id).single().execute()
        versions = sb.table("generations").select(
            "id, answer, evaluation, created_at, question, mode, char_limit, resume_id, job_analysis"
        ).eq("project_id", project_id).order("created_at").execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DB query failed: {e}")
    return {**result.data, "versions": versions.data}


@app.patch("/api/projects/{project_id}")
async def update_project(project_id: int, req: UpdateProjectRequest, request: Request):
    """프로젝트 필드 업데이트."""
    token = _extract_token(request)
    sb = _get_sb(token)
    data = req.model_dump()
    company_research = data.pop("company_research", None)

    # company_research가 있으면 companies 테이블 업데이트
    if company_research:
        proj = sb.table("generations").select("company_id").eq("id", project_id).single().execute()
        company_id = proj.data.get("company_id") if proj.data else None
        if company_id:
            _supabase_admin = __import__("src.researcher", fromlist=["_supabase"])._supabase
            _supabase_admin.table("companies").update(company_research).eq("id", company_id).execute()
        else:
            # company_id 없으면 research 엔드포인트처럼 새로 생성
            from src.researcher import _save_company, _normalize, _get_embedding
            company_name = (sb.table("generations").select("job_analysis").eq("id", project_id).single().execute().data or {}).get("job_analysis", {}).get("company", "")
            if company_name:
                row = _save_company(company_name, company_research)
                sb.table("generations").update({"company_id": row["id"]}).eq("id", project_id).execute()

    update_data = {k: v for k, v in data.items() if v is not None}
    if update_data:
        try:
            result = sb.table("generations").update(update_data).eq("id", project_id).execute()
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"DB update failed: {e}")
        if not result.data:
            raise HTTPException(status_code=404, detail="프로젝트를 찾을 수 없거나 권한이 없습니다")

    # 최신 상태 반환 (companies 조인 포함)
    result = sb.table("generations").select("*, companies(*)").eq("id", project_id).single().execute()
    return result.data


@app.delete("/api/projects/{project_id}")
async def delete_project(project_id: int, request: Request):
    """프로젝트 삭제 — 자식 버전 먼저 삭제 후 루트 삭제."""
    token = _extract_token(request)
    sb = _get_sb(token)
    try:
        sb.table("generations").delete().eq("project_id", project_id).execute()
        sb.table("generations").delete().eq("id", project_id).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DB delete failed: {e}")
    return {"ok": True}


@app.post("/api/projects/{project_id}/versions")
async def create_project_version(project_id: int, req: CreateVersionRequest, request: Request):
    """새 버전(재생성 이력) 저장 — 루트 프로젝트 행은 최신 상태로 업데이트."""
    token = _extract_token(request)
    user_id = _get_user_id(token) if token else None
    sb = _get_sb(token)

    # 루트 프로젝트 조회
    root_result = sb.table("generations").select("*").eq("id", project_id).single().execute()
    if not root_result.data:
        raise HTTPException(status_code=404, detail="프로젝트를 찾을 수 없습니다")
    root = root_result.data

    # 버전 행 생성
    version_data = {
        "project_id": project_id,
        "job_posting": root["job_posting"],
        "job_analysis": req.job_analysis or root["job_analysis"],
        "question": req.question or root["question"],
        "mode": req.mode or root["mode"],
        "char_limit": req.char_limit if req.char_limit is not None else root["char_limit"],
        "resume_id": req.resume_id if req.resume_id is not None else root["resume_id"],
        "answer": req.answer,
        "evaluation": req.evaluation,
        "is_regeneration": req.is_regeneration,
    }
    if user_id:
        version_data["user_id"] = user_id

    try:
        version_result = sb.table("generations").insert(version_data).execute()

        # 루트 행도 최신 answer/evaluation 으로 업데이트 (대시보드 status 표시용)
        root_update: dict = {"answer": req.answer}
        if req.evaluation:
            root_update["evaluation"] = req.evaluation
        sb.table("generations").update(root_update).eq("id", project_id).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"버전 저장 실패: {e}")

    return version_result.data[0]


@app.get("/api/usage")
async def get_usage(request: Request):
    """현재 사용자의 플랜 및 사용량 조회."""
    token = _extract_token(request)
    if not token:
        raise HTTPException(status_code=401, detail="인증 토큰이 필요합니다")
    user_id = _get_user_id(token)
    if not user_id:
        raise HTTPException(status_code=401, detail="유효하지 않은 토큰입니다")

    sb = _get_sb(token)
    plan = _get_user_plan(sb, user_id)
    limits = PLAN_LIMITS[plan]
    monthly = _count_monthly_usage(sb, user_id)
    resume_count = _count_resumes(sb, user_id)

    return {
        "plan": plan,
        "limits": limits,
        "usage": {
            "resumes": resume_count,
            "generations": monthly["generations"],
            "regenerations": monthly["regenerations"],
        },
    }


# ── 프로필 ──

@app.post("/api/profiles")
async def upsert_profile(req: ProfileRequest, request: Request):
    """사용자 프로필 생성/업데이트."""
    import os
    from openai import OpenAI

    token = _extract_token(request)
    if not token:
        raise HTTPException(status_code=401, detail="인증 토큰이 필요합니다")
    user_id = _get_user_id(token)
    if not user_id:
        raise HTTPException(status_code=401, detail="유효하지 않은 토큰입니다")

    profile_data: dict = {
        "user_id": user_id,
        "name": req.name,
        "phone": req.phone,
        "job_title": req.job_title,
        "job_seeker_status": req.job_seeker_status,
        "years_of_experience": req.years_of_experience,
        "education_level": req.education_level,
        "education_major": req.education_major,
        "agreed_to_terms": req.agreed_to_terms,
    }

    if req.job_title:
        client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        response = client.embeddings.create(model="text-embedding-3-small", input=req.job_title)
        profile_data["job_embedding"] = response.data[0].embedding

    sb = _get_sb(token)
    try:
        result = sb.table("profiles").upsert(profile_data, on_conflict="user_id").execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"프로필 저장 실패: {e}")

    return result.data[0]


class ChangePlanRequest(BaseModel):
    plan: str  # "free" | "pro" | "enterprise"


@app.patch("/api/profiles/plan")
async def change_plan(req: ChangePlanRequest, request: Request):
    """사용자 플랜 변경."""
    if req.plan not in ("free", "pro", "enterprise"):
        raise HTTPException(status_code=400, detail="유효하지 않은 플랜입니다")
    token = _extract_token(request)
    if not token:
        raise HTTPException(status_code=401, detail="인증 토큰이 필요합니다")
    user_id = _get_user_id(token)
    if not user_id:
        raise HTTPException(status_code=401, detail="유효하지 않은 토큰입니다")

    sb = _get_sb(token)
    try:
        result = sb.table("profiles").update({"plan": req.plan}).eq("user_id", user_id).execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="프로필이 없습니다. 회원가입을 먼저 완료해주세요.")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"플랜 변경 실패: {e}")
    return result.data[0]


@app.get("/api/profiles/me")
async def get_my_profile(request: Request):
    """현재 사용자의 프로필 조회."""
    token = _extract_token(request)
    if not token:
        raise HTTPException(status_code=401, detail="인증 토큰이 필요합니다")
    user_id = _get_user_id(token)
    if not user_id:
        raise HTTPException(status_code=401, detail="유효하지 않은 토큰입니다")

    sb = _get_sb(token)
    try:
        result = sb.table("profiles").select("*").eq("user_id", user_id).single().execute()
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"프로필을 찾을 수 없습니다: {e}")

    return result.data
