"""FastAPI 백엔드 — 기존 src/ 모듈을 API로 래핑"""

import sys
from pathlib import Path

# src 모듈 임포트를 위해 프로젝트 루트를 path에 추가
sys.path.insert(0, str(Path(__file__).parent.parent))

import tempfile

from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

load_dotenv(Path(__file__).parent.parent / ".env")

app = FastAPI(title="Cover Letter Generator API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
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

class EvaluateRequest(BaseModel):
    question: str
    answer: str
    job_analysis: dict

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

class ResumeRequest(BaseModel):
    source: str
    name: str | None = None


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


# ── Endpoints ──

@app.post("/api/analyze-job")
async def analyze_job(req: AnalyzeJobRequest):
    from src.analyzer import analyze_job_posting
    return analyze_job_posting(req.text)


@app.post("/api/generate")
async def generate(req: GenerateRequest):
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
    elif req.resume_text:
        result = process_resume(req.resume_text)
        structured = result["structured"]
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
        rag_results=rag_results,
        char_limit=req.char_limit,
        feedback=req.feedback,
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
    result = await evaluate_all(req.question, req.answer, req.job_analysis)
    feedback = aggregate_feedback(result)
    return {**result, "aggregated_feedback": feedback}


@app.post("/api/evaluate/stream")
async def evaluate_stream_endpoint(req: EvaluateRequest):
    """9명 평가관 결과를 SSE로 실시간 스트리밍한다."""
    import json as json_lib

    from starlette.responses import StreamingResponse
    from src.evaluator import evaluate_stream as _eval_stream, aggregate_feedback, _summarize_results

    async def event_generator():
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
            final = json_lib.dumps({
                "type": "summary",
                **summary,
                "aggregated_feedback": feedback,
            }, ensure_ascii=False)
            yield f"data: {final}\n\n"
        except Exception as e:
            err = json_lib.dumps({"type": "error", "message": str(e)}, ensure_ascii=False)
            yield f"data: {err}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@app.get("/api/resumes")
async def list_resumes():
    from src.parser import list_resumes
    try:
        return list_resumes()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"이력서 목록 조회 실패: {e}")


@app.post("/api/resumes")
async def add_resume(req: ResumeRequest):
    from src.parser import process_resume
    try:
        return process_resume(req.source, req.name)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"이력서 등록 실패: {e}")


@app.post("/api/resumes/upload")
async def upload_resume(file: UploadFile = File(...), name: str = Form("")):
    """PDF/txt/md 파일 업로드로 이력서 등록"""
    from src.parser import process_resume

    suffix = file.filename.rsplit(".", 1)[-1].lower() if file.filename else "txt"
    content = await file.read()

    try:
        if suffix == "pdf":
            with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
                tmp.write(content)
                tmp_path = tmp.name
            result = process_resume(tmp_path, name or file.filename)
            import os
            os.unlink(tmp_path)
        else:
            text = content.decode("utf-8")
            result = process_resume(text, name or file.filename)
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
    """이미지/PDF에서 GPT-4o 비전으로 텍스트를 추출한다."""
    import base64
    import os

    from openai import OpenAI

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

    client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[{
            "role": "user",
            "content": [
                {"type": "text", "text": "이 이미지에 있는 모든 텍스트를 빠짐없이 추출해주세요. 원문 그대로 출력하세요."},
                {"type": "image_url", "image_url": {"url": f"data:{mime};base64,{b64}"}},
            ],
        }],
        temperature=0,
    )
    return {"text": response.choices[0].message.content}


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
    """채용공고로 프로젝트 생성 (자동 분석 포함)."""
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


@app.get("/api/projects")
async def list_projects(request: Request):
    """프로젝트 목록 조회."""
    token = _extract_token(request)
    sb = _get_sb(token)
    try:
        result = sb.table("generations").select(
            "id, question, mode, char_limit, created_at, answer, evaluation, job_analysis, job_posting"
        ).order("created_at", desc=True).limit(50).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DB query failed: {e}")
    return result.data


@app.get("/api/projects/{project_id}")
async def get_project(project_id: int, request: Request):
    """프로젝트 상세 조회."""
    token = _extract_token(request)
    sb = _get_sb(token)
    try:
        result = sb.table("generations").select("*").eq("id", project_id).single().execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DB query failed: {e}")
    return result.data


@app.patch("/api/projects/{project_id}")
async def update_project(project_id: int, req: UpdateProjectRequest, request: Request):
    """프로젝트 필드 업데이트."""
    token = _extract_token(request)
    sb = _get_sb(token)
    update_data = {k: v for k, v in req.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(400, "업데이트할 필드가 없습니다")
    try:
        result = sb.table("generations").update(update_data).eq("id", project_id).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DB update failed: {e}")
    if not result.data:
        raise HTTPException(status_code=404, detail="프로젝트를 찾을 수 없거나 권한이 없습니다")
    return result.data[0]


@app.delete("/api/projects/{project_id}")
async def delete_project(project_id: int, request: Request):
    """프로젝트 삭제."""
    token = _extract_token(request)
    sb = _get_sb(token)
    try:
        sb.table("generations").delete().eq("id", project_id).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DB delete failed: {e}")
    return {"ok": True}
