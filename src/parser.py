"""이력서 파싱 (텍스트/파일/PDF → 구조화 → Supabase 저장/조회)"""

import json
import os
from pathlib import Path

from dotenv import load_dotenv
from openai import OpenAI
from supabase import create_client

load_dotenv(Path(__file__).parent.parent / ".env")

openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY"))

PARSE_SYSTEM_PROMPT = """당신은 이력서 파싱 전문가입니다.
주어진 이력서 텍스트에서 다음 정보를 JSON으로 추출하세요.

{
  "name": "이름",
  "education": [
    {"school": "학교명", "major": "전공", "gpa": "학점", "period": "기간"}
  ],
  "experience": [
    {"company": "회사명", "role": "직무/직책", "period": "기간", "description": "업무 설명"}
  ],
  "projects": [
    {"name": "프로젝트명", "role": "역할", "period": "기간", "tech_stack": ["기술"], "description": "설명", "results": "성과"}
  ],
  "skills": ["기술1", "기술2"],
  "certifications": ["자격증1"],
  "awards": ["수상내역1"],
  "languages": [{"name": "언어/시험", "score": "점수"}]
}

- 이력서에 없는 필드는 빈 배열 또는 빈 문자열로 남기세요.
- 원문의 표현을 최대한 유지하세요.
- JSON만 출력하세요."""


def read_input(source: str) -> str:
    """다양한 입력 소스에서 텍스트를 추출한다."""
    path = Path(source)

    # 파일 경로인 경우
    if path.exists():
        if path.suffix.lower() == ".pdf":
            return _read_pdf(path)
        return path.read_text(encoding="utf-8")

    # 텍스트 직접 입력인 경우
    return source


def _read_pdf(path: Path) -> str:
    """PDF에서 텍스트를 추출한다."""
    import fitz  # PyMuPDF

    doc = fitz.open(str(path))
    text_parts = [page.get_text() for page in doc]
    doc.close()
    return "\n".join(text_parts)


def parse_resume(raw_text: str) -> dict:
    """LLM으로 이력서를 구조화된 데이터로 파싱한다."""
    response = openai_client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": PARSE_SYSTEM_PROMPT},
            {"role": "user", "content": raw_text[:10000]},
        ],
        response_format={"type": "json_object"},
        temperature=0,
    )
    return json.loads(response.choices[0].message.content)


def get_embedding(text: str) -> list[float]:
    """텍스트를 임베딩 벡터로 변환한다."""
    response = openai_client.embeddings.create(
        model="text-embedding-3-small",
        input=text[:8000],
    )
    return response.data[0].embedding


def save_resume(name: str, raw_text: str, structured: dict, user_id: str | None = None) -> dict:
    """이력서를 Supabase에 저장한다. 같은 이름이면 업데이트."""
    embed_text = _structured_to_text(structured)
    embedding = get_embedding(embed_text)

    query = supabase.table("resumes").select("id").eq("name", name)
    if user_id:
        query = query.eq("user_id", user_id)
    existing = query.execute()

    if existing.data:
        result = supabase.table("resumes").update({
            "raw_text": raw_text,
            "structured_data": structured,
            "embedding": embedding,
            "updated_at": "now()",
        }).eq("id", existing.data[0]["id"]).execute()
    else:
        row = {"name": name, "raw_text": raw_text, "structured_data": structured, "embedding": embedding}
        if user_id:
            row["user_id"] = user_id
        result = supabase.table("resumes").insert(row).execute()

    return result.data[0]


def list_resumes(user_id: str | None = None) -> list[dict]:
    """저장된 이력서 목록을 조회한다."""
    query = supabase.table("resumes").select("id, name, created_at, updated_at")
    if user_id:
        query = query.eq("user_id", user_id)
    result = query.order("updated_at", desc=True).execute()
    return result.data


def get_resume(resume_id: int) -> dict:
    """저장된 이력서를 조회한다."""
    result = supabase.table("resumes").select("*").eq("id", resume_id).single().execute()
    return result.data


def delete_resume(resume_id: int) -> bool:
    """이력서를 삭제한다."""
    supabase.table("resumes").delete().eq("id", resume_id).execute()
    return True


def get_resume_by_name(name: str) -> dict | None:
    """이름으로 저장된 이력서를 조회한다."""
    result = supabase.table("resumes").select("*").eq("name", name).execute()
    return result.data[0] if result.data else None


def _structured_to_text(structured: dict) -> str:
    """구조화된 이력서를 임베딩용 텍스트로 변환한다."""
    parts = []

    if structured.get("name"):
        parts.append(f"이름: {structured['name']}")

    for edu in structured.get("education", []):
        parts.append(f"학력: {edu.get('school', '')} {edu.get('major', '')} {edu.get('gpa', '')}")

    for exp in structured.get("experience", []):
        parts.append(f"경력: {exp.get('company', '')} {exp.get('role', '')} - {exp.get('description', '')}")

    for proj in structured.get("projects", []):
        tech = ", ".join(proj.get("tech_stack", []))
        parts.append(f"프로젝트: {proj.get('name', '')} ({tech}) - {proj.get('description', '')} 성과: {proj.get('results', '')}")

    if structured.get("skills"):
        parts.append(f"기술: {', '.join(structured['skills'])}")

    if structured.get("certifications"):
        parts.append(f"자격증: {', '.join(structured['certifications'])}")

    return "\n".join(parts)


def process_resume(source: str, name: str | None = None, user_id: str | None = None) -> dict:
    """이력서 입력 → 파싱 → 저장 전체 파이프라인."""
    raw_text = read_input(source)
    structured = parse_resume(raw_text)

    resume_name = name or structured.get("name", "unnamed")
    saved = save_resume(resume_name, raw_text, structured, user_id=user_id)

    return {
        "id": saved["id"],
        "name": resume_name,
        "structured": structured,
    }
