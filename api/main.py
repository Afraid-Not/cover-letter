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
    avatar_url: str | None = None
    bio: str | None = None


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
    "free":       {"resumes": 1,  "generations": 5,  "regenerations": 0,  "company_searches": 0},
    "pro":        {"resumes": 10, "generations": -1, "regenerations": 5,  "company_searches": -1},   # -1 = unlimited
    "enterprise": {"resumes": -1, "generations": -1, "regenerations": -1, "company_searches": -1},
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
                # extra_regenerations 반영
                try:
                    extra_res = sb_plan.table("profiles").select("extra_regenerations").eq("user_id", gen_user_id).single().execute()
                    extra_regen = (extra_res.data or {}).get("extra_regenerations", 0)
                except Exception:
                    extra_regen = 0
                base_limit = limits["regenerations"]
                effective_regen_limit = (base_limit + extra_regen) if base_limit >= 0 else -1

                if effective_regen_limit == 0:
                    raise HTTPException(status_code=403, detail="PLAN_LIMIT|현재 플랜에서는 재생성이 불가합니다.")
                elif effective_regen_limit > 0:
                    monthly = _count_monthly_usage(sb_plan, gen_user_id)
                    if monthly["regenerations"] >= effective_regen_limit:
                        raise HTTPException(status_code=403, detail="PLAN_LIMIT|이번 달 재생성 횟수를 초과했습니다.")
            else:
                if limits["generations"] > 0:
                    try:
                        extra_gen_res = sb_plan.table("profiles").select("extra_generations").eq("user_id", gen_user_id).single().execute()
                        extra_gen = (extra_gen_res.data or {}).get("extra_generations", 0) or 0
                    except Exception:
                        extra_gen = 0
                    effective_gen_limit = limits["generations"] + extra_gen
                    monthly = _count_monthly_usage(sb_plan, gen_user_id)
                    if monthly["generations"] >= effective_gen_limit:
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
async def evaluate(req: EvaluateRequest, request: Request):
    from src.evaluator import evaluate_all, aggregate_feedback
    from src.scoring_tables import compute_score_adjustment

    token = _extract_token(request)
    if token:
        user_id = _get_user_id(token)
        if user_id:
            sb_eval = _get_sb(token)
            plan = _get_user_plan(sb_eval, user_id)
            if plan == "free":
                try:
                    extra_res = sb_eval.table("profiles").select("extra_regenerations").eq("user_id", user_id).single().execute()
                    extra_regen = (extra_res.data or {}).get("extra_regenerations", 0) or 0
                except Exception:
                    extra_regen = 0
                if extra_regen <= 0:
                    raise HTTPException(status_code=403, detail="PLAN_LIMIT|평가 기능은 Pro 플랜 이상에서 사용할 수 있습니다.")

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
async def evaluate_stream_endpoint(req: EvaluateRequest, request: Request):
    """9명 평가관 결과를 SSE로 실시간 스트리밍한다."""
    import json as json_lib

    from starlette.responses import StreamingResponse
    from src.evaluator import evaluate_stream as _eval_stream, aggregate_feedback, _summarize_results

    token = _extract_token(request)
    if token:
        user_id = _get_user_id(token)
        if user_id:
            sb_eval = _get_sb(token)
            plan = _get_user_plan(sb_eval, user_id)
            if plan == "free":
                try:
                    extra_res = sb_eval.table("profiles").select("extra_regenerations").eq("user_id", user_id).single().execute()
                    extra_regen = (extra_res.data or {}).get("extra_regenerations", 0) or 0
                except Exception:
                    extra_regen = 0
                if extra_regen <= 0:
                    raise HTTPException(status_code=403, detail="PLAN_LIMIT|평가 기능은 Pro 플랜 이상에서 사용할 수 있습니다.")

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


@app.patch("/api/resumes/{resume_id}")
async def update_resume(resume_id: int, body: dict, request: Request):
    """이력서 구조체 및 이름 수정"""
    token = _extract_token(request)
    sb = _get_sb(token)
    update_fields: dict = {}
    if "name" in body:
        update_fields["name"] = body["name"]
    if "structured_data" in body:
        update_fields["structured_data"] = body["structured_data"]
    if not update_fields:
        raise HTTPException(status_code=400, detail="수정할 필드가 없습니다.")
    update_fields["updated_at"] = "now()"
    try:
        result = sb.table("resumes").update(update_fields).eq("id", resume_id).execute()
        return result.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"이력서 수정 실패: {e}")


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

    # free 플랜 쿼터 체크
    user_id = _get_user_id(token) if token else None
    if user_id:
        plan = _get_user_plan(sb, user_id)
        if plan == "free":
            sb_admin = _get_sb()
            try:
                extra_res = sb_admin.table("profiles").select("extra_company_searches").eq("user_id", user_id).single().execute()
                extra_searches = (extra_res.data or {}).get("extra_company_searches", 0) or 0
            except Exception:
                extra_searches = 0
            if extra_searches <= 0:
                raise HTTPException(status_code=403, detail="COMPANY_SEARCH_LIMIT|Free 플랜에서는 회사 자동 검색을 사용할 수 없습니다. 쿠폰으로 검색 크레딧을 추가하세요.")

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

    # free 플랜: 크레딧 차감
    if user_id and plan == "free":  # type: ignore[possibly-undefined]
        try:
            sb_admin.table("profiles").update({"extra_company_searches": extra_searches - 1}).eq("user_id", user_id).execute()  # type: ignore[possibly-undefined]
        except Exception:
            pass  # 차감 실패는 무시 (이미 검색은 완료됨)

    # 최신 프로젝트 데이터를 companies 조인해서 반환
    result = sb.table("generations").select("*, companies(*)").eq("id", project_id).single().execute()
    return result.data


@app.get("/api/activity")
async def list_activity(request: Request):
    """최근 활동 통합 피드 — 프로젝트 생성 + 이력서 등록 + 재생성."""
    token = _extract_token(request)
    sb = _get_sb(token)
    user_id = _get_user_id(token) if token else None
    if not user_id:
        raise HTTPException(status_code=401, detail="인증 토큰이 필요합니다")

    events: list[dict] = []

    # 프로젝트 생성
    try:
        rows = sb.table("generations").select(
            "id, created_at, job_analysis, is_regeneration"
        ).is_("project_id", "null").is_("deleted_at", "null").order("created_at", desc=True).limit(30).execute()
        for r in (rows.data or []):
            ja = r.get("job_analysis") or {}
            events.append({
                "type": "project",
                "id": r["id"],
                "label": ja.get("company") or "회사명 없음",
                "sub": ja.get("position"),
                "created_at": r["created_at"],
            })
    except Exception:
        pass

    # 이력서 등록
    try:
        rows = sb.table("resumes").select(
            "id, name, created_at"
        ).eq("user_id", user_id).order("created_at", desc=True).limit(30).execute()
        for r in (rows.data or []):
            events.append({
                "type": "resume",
                "id": r["id"],
                "label": r.get("name") or "이력서",
                "sub": None,
                "created_at": r["created_at"],
            })
    except Exception:
        pass

    # 재생성 (versions)
    try:
        rows = sb.table("generations").select(
            "id, created_at, job_analysis, project_id"
        ).not_.is_("project_id", "null").eq("is_regeneration", True).order("created_at", desc=True).limit(30).execute()
        # RLS가 user_id 필터링해줌
        for r in (rows.data or []):
            ja = r.get("job_analysis") or {}
            events.append({
                "type": "regeneration",
                "id": r["project_id"],
                "label": ja.get("company") or "재생성",
                "sub": ja.get("position"),
                "created_at": r["created_at"],
            })
    except Exception:
        pass

    events.sort(key=lambda e: e["created_at"], reverse=True)
    return events[:30]


@app.get("/api/projects")
async def list_projects(request: Request):
    """프로젝트 목록 조회 (루트 프로젝트만)."""
    token = _extract_token(request)
    sb = _get_sb(token)
    try:
        result = sb.table("generations").select(
            "id, question, mode, char_limit, resume_id, answer, created_at, job_analysis, evaluation"
        ).is_("project_id", "null").is_("deleted_at", "null").order("created_at", desc=True).limit(50).execute()
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
    """프로젝트 소프트 삭제 — deleted_at 설정 (버전 행 유지로 월별 사용량 카운트 보존)."""
    from datetime import datetime, timezone
    token = _extract_token(request)
    sb = _get_sb(token)
    try:
        sb.table("generations").update(
            {"deleted_at": datetime.now(timezone.utc).isoformat()}
        ).eq("id", project_id).execute()
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


@app.patch("/api/projects/{project_id}/versions/{version_id}")
async def update_project_version(project_id: int, version_id: int, req: Request):
    """버전의 평가 결과 업데이트 (평가하기 버튼 사용 시)."""
    import json as json_lib
    token = _extract_token(req)
    user_id = _get_user_id(token) if token else None
    sb = _get_sb(token)

    body = await req.json()
    evaluation = body.get("evaluation")

    if evaluation is None:
        raise HTTPException(status_code=400, detail="evaluation 필드가 필요합니다")

    try:
        # 버전 소유권 확인
        ver = sb.table("generations").select("user_id, project_id").eq("id", version_id).single().execute()
        if not ver.data:
            raise HTTPException(status_code=404, detail="버전을 찾을 수 없습니다")
        if user_id and ver.data.get("user_id") and ver.data["user_id"] != user_id:
            raise HTTPException(status_code=403, detail="권한이 없습니다")

        sb.table("generations").update({"evaluation": evaluation}).eq("id", version_id).execute()

        # 루트 행도 최신 evaluation 으로 업데이트
        sb.table("generations").update({"evaluation": evaluation}).eq("id", project_id).execute()
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"평가 저장 실패: {e}")

    return {"ok": True}


@app.get("/api/plan-settings")
async def get_plan_settings():
    """플랜 활성화 여부 조회 (퍼블릭)."""
    sb = _get_sb()
    try:
        result = sb.table("app_settings").select("key, value").in_(
            "key", ["plan_free_enabled", "plan_pro_enabled", "plan_enterprise_enabled"]
        ).execute()
        settings = {row["key"]: row["value"] for row in (result.data or [])}
    except Exception:
        settings = {}
    return {
        "plan_free_enabled": settings.get("plan_free_enabled", True),
        "plan_pro_enabled": settings.get("plan_pro_enabled", True),
        "plan_enterprise_enabled": settings.get("plan_enterprise_enabled", True),
    }


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
    limits = dict(PLAN_LIMITS[plan])
    monthly = _count_monthly_usage(sb, user_id)
    resume_count = _count_resumes(sb, user_id)

    # extra_regenerations / extra_generations / extra_company_searches 반영: 한도가 무제한(-1)이 아닌 경우에만 더함
    try:
        extra_res = sb.table("profiles").select("extra_regenerations, extra_generations, extra_company_searches").eq("user_id", user_id).single().execute()
        extra_regen = (extra_res.data or {}).get("extra_regenerations", 0) or 0
        extra_gen = (extra_res.data or {}).get("extra_generations", 0) or 0
        extra_company_searches = (extra_res.data or {}).get("extra_company_searches", 0) or 0
    except Exception:
        extra_regen = 0
        extra_gen = 0
        extra_company_searches = 0
    if limits["regenerations"] >= 0:
        limits["regenerations"] += extra_regen
    if limits["generations"] >= 0:
        limits["generations"] += extra_gen
    if limits["company_searches"] >= 0:
        limits["company_searches"] += extra_company_searches

    return {
        "plan": plan,
        "limits": limits,
        "usage": {
            "resumes": resume_count,
            "generations": monthly["generations"],
            "regenerations": monthly["regenerations"],
        },
        "extra_company_searches": extra_company_searches,
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
        "avatar_url": req.avatar_url,
        "bio": req.bio,
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
    # 플랜 구매 가능 여부 확인
    sb_admin = _get_sb()
    try:
        setting = sb_admin.table("app_settings").select("value").eq("key", f"plan_{req.plan}_enabled").single().execute()
        if setting.data and setting.data.get("value") is False:
            raise HTTPException(status_code=403, detail="현재 해당 플랜은 구매할 수 없습니다.")
    except HTTPException:
        raise
    except Exception:
        pass  # app_settings 조회 실패시 허용
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


@app.delete("/api/account")
async def delete_account(request: Request):
    """현재 사용자 계정 삭제 (회원탈퇴)."""
    import os
    from supabase import create_client
    token = _extract_token(request)
    if not token:
        raise HTTPException(status_code=401, detail="인증 토큰이 필요합니다")
    user_id = _get_user_id(token)
    if not user_id:
        raise HTTPException(status_code=401, detail="유효하지 않은 토큰입니다")

    service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY", "")
    sb_admin = create_client(os.getenv("SUPABASE_URL", ""), service_key)
    try:
        sb_admin.auth.admin.delete_user(user_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"계정 삭제 실패: {e}")
    return {"ok": True}


# ── 관리자 (Admin) ──

def _check_admin(token: str | None) -> str:
    """토큰에서 user_id를 추출하고 admin 권한을 검증한다. user_id 반환."""
    if not token:
        raise HTTPException(status_code=401, detail="인증 토큰이 필요합니다")
    user_id = _get_user_id(token)
    if not user_id:
        raise HTTPException(status_code=401, detail="유효하지 않은 토큰입니다")
    sb = _get_sb()  # service_role — RLS bypass
    try:
        result = sb.table("profiles").select("role").eq("user_id", user_id).single().execute()
        role = (result.data or {}).get("role", "user")
    except Exception:
        role = "user"
    if role != "admin":
        raise HTTPException(status_code=403, detail="관리자 권한이 필요합니다")
    return user_id


class AdminChangePlanRequest(BaseModel):
    plan: str  # "free" | "pro" | "enterprise"


class AdminExtraRegenRequest(BaseModel):
    extra_regenerations: int  # 절댓값으로 설정


class AdminExtraCompanySearchRequest(BaseModel):
    extra_company_searches: int  # 절댓값으로 설정


class AdminCouponCreateRequest(BaseModel):
    code: str
    bonus_generations: int = 5
    bonus_regenerations: int = 25
    bonus_company_searches: int = 0


class CouponRedeemRequest(BaseModel):
    code: str


class AdminSettingsRequest(BaseModel):
    plan_free_enabled: bool | None = None
    plan_pro_enabled: bool | None = None
    plan_enterprise_enabled: bool | None = None


@app.get("/api/admin/stats")
async def admin_stats(request: Request):
    """서비스 전체 KPI 지표 조회."""
    _check_admin(_extract_token(request))
    from datetime import datetime, timezone, date
    sb = _get_sb()

    today_start = datetime.combine(date.today(), datetime.min.time()).replace(tzinfo=timezone.utc).isoformat()

    try:
        total_users = sb.table("profiles").select("user_id", count="exact").execute().count or 0
        plan_dist_res = sb.table("profiles").select("plan").execute()
        plan_dist: dict = {"free": 0, "pro": 0, "enterprise": 0}
        for row in (plan_dist_res.data or []):
            plan_dist[row.get("plan", "free")] = plan_dist.get(row.get("plan", "free"), 0) + 1

        today_gen = sb.table("generations").select("id", count="exact").gte("created_at", today_start).is_("project_id", "null").execute().count or 0
        total_gen = sb.table("generations").select("id", count="exact").is_("project_id", "null").execute().count or 0
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"통계 조회 실패: {e}")

    return {
        "total_users": total_users,
        "today_generations": today_gen,
        "total_generations": total_gen,
        "plan_distribution": plan_dist,
    }


@app.get("/api/admin/users")
async def admin_list_users(request: Request):
    """전체 유저 목록 (프로필 + 이메일) 조회."""
    import httpx
    _check_admin(_extract_token(request))
    sb = _get_sb()
    service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY", "")
    supabase_url = os.getenv("SUPABASE_URL", "")

    try:
        profiles_res = sb.table("profiles").select("user_id, name, plan, role, extra_regenerations, extra_company_searches, created_at").execute()
        profiles_map = {p["user_id"]: p for p in (profiles_res.data or [])}

        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                f"{supabase_url}/auth/v1/admin/users",
                headers={"apikey": service_key, "Authorization": f"Bearer {service_key}"},
                params={"per_page": 1000},
            )
        auth_users = resp.json().get("users", []) if resp.status_code == 200 else []

        result = []
        for u in auth_users:
            uid = u.get("id")
            profile = profiles_map.get(uid, {})
            result.append({
                "user_id": uid,
                "email": u.get("email", ""),
                "name": profile.get("name", ""),
                "plan": profile.get("plan", "free"),
                "role": profile.get("role", "user"),
                "extra_regenerations": profile.get("extra_regenerations", 0),
                "created_at": u.get("created_at", ""),
            })
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"유저 목록 조회 실패: {e}")

    return result


@app.get("/api/admin/generations")
async def admin_list_generations(request: Request):
    """최근 생성 이력 조회 (루트 프로젝트만)."""
    _check_admin(_extract_token(request))
    sb = _get_sb()
    try:
        result = sb.table("generations").select(
            "id, user_id, job_analysis, answer, is_regeneration, created_at"
        ).is_("project_id", "null").order("created_at", desc=True).limit(100).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"생성 이력 조회 실패: {e}")
    return result.data or []


@app.get("/api/admin/resumes")
async def admin_list_resumes(request: Request):
    """관리자: 전체 이력서 등록 이력 조회."""
    _check_admin(_extract_token(request))
    sb = _get_sb()
    try:
        result = sb.table("resumes").select(
            "id, user_id, name, created_at"
        ).order("created_at", desc=True).limit(100).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"이력서 이력 조회 실패: {e}")
    return result.data or []


@app.get("/api/admin/settings")
async def admin_get_settings(request: Request):
    """앱 설정 조회 (플랜 on/off)."""
    _check_admin(_extract_token(request))
    sb = _get_sb()
    try:
        result = sb.table("app_settings").select("key, value").execute()
        return {row["key"]: row["value"] for row in (result.data or [])}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"설정 조회 실패: {e}")


@app.patch("/api/admin/settings")
async def admin_update_settings(req: AdminSettingsRequest, request: Request):
    """앱 설정 업데이트 (플랜 on/off)."""
    _check_admin(_extract_token(request))
    sb = _get_sb()
    updates = {}
    if req.plan_free_enabled is not None:
        updates["plan_free_enabled"] = req.plan_free_enabled
    if req.plan_pro_enabled is not None:
        updates["plan_pro_enabled"] = req.plan_pro_enabled
    if req.plan_enterprise_enabled is not None:
        updates["plan_enterprise_enabled"] = req.plan_enterprise_enabled

    try:
        for key, val in updates.items():
            sb.table("app_settings").upsert({"key": key, "value": val, "updated_at": "now()"}, on_conflict="key").execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"설정 업데이트 실패: {e}")
    return {"ok": True}


@app.patch("/api/admin/users/{user_id}/plan")
async def admin_change_user_plan(user_id: str, req: AdminChangePlanRequest, request: Request):
    """관리자: 특정 유저의 플랜 강제 변경."""
    _check_admin(_extract_token(request))
    if req.plan not in ("free", "pro", "enterprise"):
        raise HTTPException(status_code=400, detail="유효하지 않은 플랜입니다")
    sb = _get_sb()
    try:
        sb.table("profiles").update({"plan": req.plan}).eq("user_id", user_id).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"플랜 변경 실패: {e}")
    return {"ok": True}


@app.patch("/api/admin/users/{user_id}/extra-regenerations")
async def admin_set_extra_regenerations(user_id: str, req: AdminExtraRegenRequest, request: Request):
    """관리자: 특정 유저의 추가 재생성 횟수 설정."""
    _check_admin(_extract_token(request))
    if req.extra_regenerations < 0:
        raise HTTPException(status_code=400, detail="음수는 허용되지 않습니다")
    sb = _get_sb()
    try:
        sb.table("profiles").update({"extra_regenerations": req.extra_regenerations}).eq("user_id", user_id).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"추가 재생성 횟수 설정 실패: {e}")
    return {"ok": True}


@app.patch("/api/admin/users/{user_id}/extra-company-searches")
async def admin_set_extra_company_searches(user_id: str, req: AdminExtraCompanySearchRequest, request: Request):
    """관리자: 특정 유저의 추가 회사 검색 크레딧 설정."""
    _check_admin(_extract_token(request))
    if req.extra_company_searches < 0:
        raise HTTPException(status_code=400, detail="음수는 허용되지 않습니다")
    sb = _get_sb()
    try:
        sb.table("profiles").update({"extra_company_searches": req.extra_company_searches}).eq("user_id", user_id).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"추가 회사 검색 크레딧 설정 실패: {e}")
    return {"ok": True}


@app.post("/api/admin/coupons")
async def admin_create_coupon(req: AdminCouponCreateRequest, request: Request):
    """관리자: 쿠폰 코드 생성 (발급 후 7일 만료)."""
    _check_admin(_extract_token(request))
    code = req.code.strip().upper()
    if not code:
        raise HTTPException(status_code=400, detail="쿠폰 코드를 입력해주세요")
    from datetime import datetime, timedelta, timezone
    expires_at = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
    sb = _get_sb()
    try:
        sb.table("coupons").insert({
            "code": code,
            "expires_at": expires_at,
            "bonus_generations": req.bonus_generations,
            "bonus_regenerations": req.bonus_regenerations,
            "bonus_company_searches": req.bonus_company_searches,
        }).execute()
    except Exception as e:
        if "duplicate" in str(e).lower() or "unique" in str(e).lower() or "23505" in str(e):
            raise HTTPException(status_code=409, detail="이미 존재하는 쿠폰 코드입니다")
        raise HTTPException(status_code=500, detail=f"쿠폰 생성 실패: {e}")
    return {"code": code, "expires_at": expires_at, "bonus_generations": req.bonus_generations, "bonus_regenerations": req.bonus_regenerations, "bonus_company_searches": req.bonus_company_searches}


@app.get("/api/admin/coupons")
async def admin_list_coupons(request: Request):
    """관리자: 쿠폰 목록 조회."""
    _check_admin(_extract_token(request))
    sb = _get_sb()
    try:
        res = sb.table("coupons").select("*").order("created_at", desc=True).execute()
        return res.data or []
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"쿠폰 목록 조회 실패: {e}")


@app.post("/api/coupons/redeem")
async def redeem_coupon(req: CouponRedeemRequest, request: Request):
    """쿠폰 사용 — Enterprise 플랜은 사용 불가, 1인 1회."""
    token = _extract_token(request)
    if not token:
        raise HTTPException(status_code=401, detail="인증이 필요합니다")
    user_id = _get_user_id(token)
    if not user_id:
        raise HTTPException(status_code=401, detail="유효하지 않은 토큰입니다")

    sb_user = _get_sb(token)
    plan = _get_user_plan(sb_user, user_id)
    if plan == "enterprise":
        raise HTTPException(status_code=400, detail="Enterprise 플랜은 쿠폰을 사용할 수 없습니다")

    code = req.code.strip().upper()
    sb = _get_sb()  # service role — RLS bypass
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc).isoformat()

    try:
        coupon_res = sb.table("coupons").select("*").eq("code", code).single().execute()
    except Exception:
        raise HTTPException(status_code=404, detail="존재하지 않는 쿠폰 코드입니다")

    coupon = coupon_res.data
    if not coupon:
        raise HTTPException(status_code=404, detail="존재하지 않는 쿠폰 코드입니다")
    if coupon.get("used_by"):
        raise HTTPException(status_code=409, detail="이미 사용된 쿠폰입니다")
    if coupon["expires_at"] < now:
        raise HTTPException(status_code=410, detail="만료된 쿠폰입니다")

    # 쿠폰 사용 처리
    try:
        sb.table("coupons").update({"used_by": user_id, "used_at": now}).eq("code", code).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"쿠폰 처리 실패: {e}")

    bonus_gen = coupon.get("bonus_generations", 5)
    bonus_regen = coupon.get("bonus_regenerations", 25)
    bonus_search = coupon.get("bonus_company_searches", 0)

    try:
        profile_res = sb.table("profiles").select("extra_generations, extra_regenerations, extra_company_searches").eq("user_id", user_id).single().execute()
        current = profile_res.data or {}
        new_gen = (current.get("extra_generations") or 0) + bonus_gen
        new_regen = (current.get("extra_regenerations") or 0) + bonus_regen
        new_search = (current.get("extra_company_searches") or 0) + bonus_search
        sb.table("profiles").update({
            "extra_generations": new_gen,
            "extra_regenerations": new_regen,
            "extra_company_searches": new_search,
        }).eq("user_id", user_id).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"사용량 업데이트 실패: {e}")

    return {"ok": True, "bonus_generations": bonus_gen, "bonus_regenerations": bonus_regen, "bonus_company_searches": bonus_search}


# ── 결제 (Toss Payments) ──

TOSS_SECRET_KEY = os.getenv("TOSS_SECRET_KEY", "")

PLAN_AMOUNTS = {"pro": 9900, "enterprise": 99000}
PLAN_NAMES   = {"pro": "AURA Pro", "enterprise": "AURA Enterprise"}


class BillingAuthRequest(BaseModel):
    auth_key: str
    customer_key: str
    plan: str  # "pro" | "enterprise"


@app.post("/api/payments/billing-auth")
async def billing_auth(req: BillingAuthRequest, request: Request):
    """빌링키 발급 + 즉시 첫 결제 후 플랜 활성화."""
    import base64, uuid as _uuid, httpx
    from datetime import datetime, timezone, timedelta

    token = _extract_token(request)
    if not token:
        raise HTTPException(status_code=401, detail="인증 토큰이 필요합니다")
    user_id = _get_user_id(token)
    if not user_id:
        raise HTTPException(status_code=401, detail="유효하지 않은 토큰입니다")
    if req.plan not in ("pro", "enterprise"):
        raise HTTPException(status_code=400, detail="유효하지 않은 플랜입니다")

    secret = base64.b64encode(f"{TOSS_SECRET_KEY}:".encode()).decode()
    headers = {"Authorization": f"Basic {secret}", "Content-Type": "application/json"}

    async with httpx.AsyncClient(timeout=15.0) as client:
        # 1. 빌링키 발급
        auth_res = await client.post(
            f"https://api.tosspayments.com/v1/billing/authorizations/{req.auth_key}",
            headers=headers,
            json={"customerKey": req.customer_key},
        )
        if auth_res.status_code != 200:
            raise HTTPException(status_code=400, detail=f"빌링키 발급 실패: {auth_res.text}")
        billing_key = auth_res.json()["billingKey"]

        # 2. 즉시 첫 결제
        order_id = f"AURA-{_uuid.uuid4().hex[:16]}"
        pay_res = await client.post(
            f"https://api.tosspayments.com/v1/billing/{billing_key}",
            headers=headers,
            json={
                "customerKey": req.customer_key,
                "amount": PLAN_AMOUNTS[req.plan],
                "orderId": order_id,
                "orderName": PLAN_NAMES[req.plan],
            },
        )
        if pay_res.status_code != 200:
            raise HTTPException(status_code=400, detail=f"결제 실패: {pay_res.text}")

    now = datetime.now(timezone.utc)
    next_billing = now + timedelta(days=30)

    sb = _get_sb()  # service_role — RLS bypass
    sb.table("subscriptions").upsert(
        {
            "user_id": user_id,
            "plan": req.plan,
            "billing_key": billing_key,
            "customer_key": req.customer_key,
            "status": "active",
            "amount": PLAN_AMOUNTS[req.plan],
            "last_billed_at": now.isoformat(),
            "next_billing_date": next_billing.isoformat(),
            "updated_at": now.isoformat(),
        },
        on_conflict="user_id",
    ).execute()
    sb.table("profiles").update({"plan": req.plan}).eq("user_id", user_id).execute()

    return {"ok": True, "plan": req.plan}


@app.get("/api/payments/subscription")
async def get_subscription(request: Request):
    """현재 구독 정보 조회."""
    token = _extract_token(request)
    if not token:
        raise HTTPException(status_code=401, detail="인증 토큰이 필요합니다")
    user_id = _get_user_id(token)
    if not user_id:
        raise HTTPException(status_code=401, detail="유효하지 않은 토큰입니다")

    sb = _get_sb()
    try:
        result = (
            sb.table("subscriptions")
            .select("plan, status, amount, last_billed_at, next_billing_date, created_at")
            .eq("user_id", user_id)
            .single()
            .execute()
        )
        return result.data or {}
    except Exception:
        return {}


@app.delete("/api/payments/subscription")
async def cancel_subscription(request: Request):
    """구독 취소 — 즉시 free 다운그레이드."""
    from datetime import datetime, timezone

    token = _extract_token(request)
    if not token:
        raise HTTPException(status_code=401, detail="인증 토큰이 필요합니다")
    user_id = _get_user_id(token)
    if not user_id:
        raise HTTPException(status_code=401, detail="유효하지 않은 토큰입니다")

    now = datetime.now(timezone.utc).isoformat()
    sb = _get_sb()
    sb.table("subscriptions").update({"status": "cancelled", "updated_at": now}).eq("user_id", user_id).execute()
    sb.table("profiles").update({"plan": "free"}).eq("user_id", user_id).execute()
    return {"ok": True}


@app.post("/api/payments/webhook")
async def payment_webhook(request: Request):
    """토스 자동결제 웹훅 — 결제 성공/실패 처리."""
    import json as _json
    from datetime import datetime, timezone, timedelta

    body = await request.body()
    try:
        data = _json.loads(body)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON")

    payment = data.get("data", {})
    customer_key = payment.get("customerKey")
    status = payment.get("status")
    if not customer_key:
        return {"ok": True}

    now = datetime.now(timezone.utc)
    sb = _get_sb()

    if status == "DONE":
        next_billing = now + timedelta(days=30)
        sb.table("subscriptions").update(
            {
                "status": "active",
                "last_billed_at": now.isoformat(),
                "next_billing_date": next_billing.isoformat(),
                "updated_at": now.isoformat(),
            }
        ).eq("customer_key", customer_key).execute()
    elif status == "FAILED":
        sub = sb.table("subscriptions").select("user_id").eq("customer_key", customer_key).single().execute()
        if sub.data:
            uid = sub.data["user_id"]
            sb.table("subscriptions").update({"status": "failed", "updated_at": now.isoformat()}).eq("customer_key", customer_key).execute()
            sb.table("profiles").update({"plan": "free"}).eq("user_id", uid).execute()

    return {"ok": True}


@app.post("/api/payments/charge-recurring")
async def charge_recurring(request: Request):
    """월 자동결제 — cron-job.org에서 매월 호출."""
    import base64, uuid as _uuid, httpx
    from datetime import datetime, timezone, timedelta

    # 시크릿 키 검증 (헤더 또는 쿼리 파라미터)
    cron_secret = os.getenv("CRON_SECRET", "")
    provided = request.headers.get("x-cron-secret") or request.query_params.get("secret")
    if provided != cron_secret:
        raise HTTPException(status_code=401, detail="Unauthorized")

    now = datetime.now(timezone.utc)
    sb = _get_sb()

    # next_billing_date가 지난 활성 구독 조회
    subs = (
        sb.table("subscriptions")
        .select("user_id, plan, billing_key, customer_key, amount")
        .eq("status", "active")
        .lte("next_billing_date", now.isoformat())
        .execute()
    )

    if not subs.data:
        return {"ok": True, "charged": 0, "failed": 0}

    secret = base64.b64encode(f"{TOSS_SECRET_KEY}:".encode()).decode()
    headers = {"Authorization": f"Basic {secret}", "Content-Type": "application/json"}

    charged, failed = 0, 0
    async with httpx.AsyncClient(timeout=15.0) as client:
        for sub in subs.data:
            order_id = f"AURA-{_uuid.uuid4().hex[:16]}"
            try:
                res = await client.post(
                    f"https://api.tosspayments.com/v1/billing/{sub['billing_key']}",
                    headers=headers,
                    json={
                        "customerKey": sub["customer_key"],
                        "amount": sub["amount"],
                        "orderId": order_id,
                        "orderName": PLAN_NAMES.get(sub["plan"], "AURA"),
                    },
                )
                if res.status_code == 200:
                    next_billing = now + timedelta(days=30)
                    sb.table("subscriptions").update({
                        "last_billed_at": now.isoformat(),
                        "next_billing_date": next_billing.isoformat(),
                        "updated_at": now.isoformat(),
                    }).eq("user_id", sub["user_id"]).execute()
                    charged += 1
                else:
                    raise Exception(res.text)
            except Exception as e:
                logging.error(f"[charge-recurring] user={sub['user_id']} error={e}")
                sb.table("subscriptions").update({"status": "failed", "updated_at": now.isoformat()}).eq("user_id", sub["user_id"]).execute()
                sb.table("profiles").update({"plan": "free"}).eq("user_id", sub["user_id"]).execute()
                failed += 1

    return {"ok": True, "charged": charged, "failed": failed}
