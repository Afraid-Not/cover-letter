"""RAG 결과 + 이력서 + 채용공고 → 자소서 답변 생성"""

import os
from pathlib import Path

from dotenv import load_dotenv
from openai import OpenAI

load_dotenv(Path(__file__).parent.parent / ".env")

openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

GENERATE_SYSTEM_PROMPT = """당신은 자소서 작성 전문가입니다.
아래 정보를 바탕으로 자소서 답변을 작성하세요.

## 작성 원칙
1. **사람이 쓴 것처럼** — AI 특유의 나열식/요약식 톤을 절대 쓰지 마세요.
2. **합격 자소서 스타일 참고** — 제공된 합격 사례의 문체, 구조, 톤을 자연스럽게 따르세요.
3. **내 경험 기반** — 이력서에 있는 실제 경험만 사용하세요. 허구를 만들지 마세요.
4. **채용공고 맞춤** — 채용공고의 요구 역량과 키워드를 자연스럽게 녹이세요.
5. **구체적으로** — 프로젝트명, 기술, 수치, 결과 등 구체적 사실을 포함하세요.
6. **자연스러운 흐름** — 상황 → 행동 → 결과가 자연스럽게 이어지도록 작성하세요.

## 금지 사항
- "저는 ~라고 생각합니다"로 시작하지 마세요.
- 불필요한 수식어, 과장된 표현을 쓰지 마세요.
- 각 문단의 첫 문장에 핵심을 담으세요.
- 글자수 제한이 있으면 반드시 지키세요."""


def generate_answer(
    question: str,
    job_analysis: dict,
    resume_structured: dict,
    rag_results: list[dict],
    char_limit: int | None = None,
    feedback: str | None = None,
) -> str:
    """자소서 답변을 생성한다."""
    user_prompt = _build_user_prompt(
        question, job_analysis, resume_structured, rag_results, char_limit, feedback
    )

    response = openai_client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": GENERATE_SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
        temperature=0.7,
    )

    return response.choices[0].message.content.strip()


def _build_user_prompt(
    question: str,
    job_analysis: dict,
    resume_structured: dict,
    rag_results: list[dict],
    char_limit: int | None,
    feedback: str | None,
) -> str:
    """생성 프롬프트를 구성한다."""
    parts = []

    # 자소서 질문
    parts.append(f"## 자소서 질문\n{question}")
    if char_limit:
        parts.append(f"(글자수 제한: {char_limit}자)")

    # 채용공고 분석
    parts.append(f"\n## 채용공고 분석")
    parts.append(f"- 회사: {job_analysis.get('company', '')}")
    parts.append(f"- 직무: {job_analysis.get('position', '')}")
    if job_analysis.get("required_skills"):
        parts.append(f"- 필수 역량: {', '.join(job_analysis['required_skills'])}")
    if job_analysis.get("preferred_skills"):
        parts.append(f"- 우대 역량: {', '.join(job_analysis['preferred_skills'])}")
    if job_analysis.get("keywords"):
        parts.append(f"- 핵심 키워드: {', '.join(job_analysis['keywords'])}")

    # 이력서 정보
    parts.append(f"\n## 내 이력서")
    parts.append(_resume_to_text(resume_structured))

    # RAG 참고 자소서
    parts.append(f"\n## 참고할 합격 자소서 (스타일/구조만 참고, 내용 복사 금지)")
    for i, r in enumerate(rag_results[:3]):
        child = r["child"]
        parts.append(f"\n### 참고 {i+1} (유사도: {child.get('similarity', 0):.2f})")
        parts.append(child.get("answer", ""))

    # 재생성 피드백
    if feedback:
        parts.append(f"\n## 이전 평가 피드백 (이 점을 반영해서 개선하세요)")
        parts.append(feedback)

    parts.append(f"\n## 작성 지시")
    parts.append("위 정보를 바탕으로 자소서 답변을 작성하세요. 합격 자소서의 톤과 구조를 참고하되, 내 경험을 녹여서 작성하세요.")

    return "\n".join(parts)


def _resume_to_text(structured: dict) -> str:
    """구조화된 이력서를 텍스트로 변환한다."""
    parts = []

    for edu in structured.get("education", []):
        parts.append(f"- 학력: {edu.get('school', '')} {edu.get('major', '')} (GPA: {edu.get('gpa', '')})")

    for exp in structured.get("experience", []):
        parts.append(f"- 경력: {exp.get('company', '')} {exp.get('role', '')} ({exp.get('period', '')})")
        if exp.get("description"):
            parts.append(f"  {exp['description']}")

    for proj in structured.get("projects", []):
        tech = ", ".join(proj.get("tech_stack", []))
        parts.append(f"- 프로젝트: {proj.get('name', '')} ({tech})")
        if proj.get("description"):
            parts.append(f"  {proj['description']}")
        if proj.get("results"):
            parts.append(f"  성과: {proj['results']}")

    if structured.get("skills"):
        parts.append(f"- 기술 스택: {', '.join(structured['skills'])}")

    if structured.get("certifications"):
        parts.append(f"- 자격증: {', '.join(structured['certifications'])}")

    if structured.get("awards"):
        parts.append(f"- 수상: {', '.join(structured['awards'])}")

    return "\n".join(parts) if parts else "(이력서 정보 없음)"
