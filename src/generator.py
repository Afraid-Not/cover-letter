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
3. **내 경험 기반** — [이력서 원문]에 명시된 실제 경험만 사용하세요. 허구를 만들지 마세요.
4. **채용공고 맞춤** — 채용공고의 요구 역량과 키워드를 자연스럽게 녹이세요.
5. **구체적으로** — 프로젝트명, 기술, 수치, 결과 등 구체적 사실을 포함하세요.
6. **자연스러운 흐름** — 상황 → 행동 → 결과가 자연스럽게 이어지도록 작성하세요.

## 절대 금지 (이것이 가장 중요한 규칙입니다)
- **[이력서 원문]에 없는 내용은 단 한 글자도 추가하지 마세요.** 학위명, 전공, 기술 스택, 프로젝트, 수치, 자격증 모두 원문에 명시된 것만 사용하세요. 원문에 없으면 절대 쓰지 마세요.
- **참고 자소서의 경험을 내 경험인 것처럼 쓰지 마세요.** 참고 자소서에 나오는 회사명, 프로젝트, 기술, 수치, 자격증은 다른 사람의 것입니다. 절대 가져다 쓰지 마세요.
- 채용공고에 요구되는 기술이라도 이력서 원문에 없으면 보유한 것처럼 쓰지 마세요.
- "저는 ~라고 생각합니다"로 시작하지 마세요.
- 불필요한 수식어, 과장된 표현을 쓰지 마세요.
- 각 문단의 첫 문장에 핵심을 담으세요.
- 글자수 제한이 있으면 반드시 지키세요. 지정된 글자수의 90%~100% 범위를 엄수하세요 (예: 1000자 → 900~1000자)."""

REGENERATE_SYSTEM_PROMPT = """당신은 자소서 개선 전문가입니다.
이전에 작성된 자소서에 대해 실제 채용 담당자들의 평가 피드백이 있습니다.
이 피드백을 **빠짐없이** 반영하여 자소서를 개선하세요.

## 개선 원칙
1. **피드백 우선** — 아래 제시된 피드백 항목을 하나씩 확인하며 반드시 반영하세요.
2. **잘된 부분 유지** — 피드백이 없는 부분은 이전 답변의 강점을 그대로 살리세요.
3. **구체성 강화** — 피드백에서 "구체적이지 않다"는 지적이 있으면 수치·결과·프로젝트명을 추가하세요.
4. **사람이 쓴 것처럼** — AI 특유의 나열식 톤을 절대 쓰지 마세요.
5. **내 경험 기반** — 이력서에 있는 실제 경험만 사용하세요. 허구를 만들지 마세요.
6. **글자수 제한** — 글자수 제한이 있으면 반드시 지키세요. 지정된 글자수의 90%~100% 범위를 엄수하세요 (예: 1000자 → 900~1000자).

## 절대 금지
- [이력서 원문]에 없는 학위명·전공·기술·경험·수치를 새로 만들지 마세요. 구체성 강화를 위해 없는 내용을 지어내는 것은 금지입니다.
- 채용공고에 요구되는 기술이라도 이력서 원문에 없으면 보유한 것처럼 쓰지 마세요.
- 참고 자소서에 나오는 다른 사람의 회사명, 프로젝트, 수치를 내 것처럼 쓰지 마세요."""


def generate_answer(
    question: str,
    job_analysis: dict,
    resume_structured: dict,
    rag_results: list[dict],
    char_limit: int | None = None,
    feedback: str | None = None,
    previous_answer: str | None = None,
    company_research: dict | None = None,
    resume_raw_text: str | None = None,
) -> str:
    """자소서 답변을 생성한다. 글자수 제한이 있으면 ±10% 범위를 만족할 때까지 최대 3회 재시도한다."""
    is_regen = bool(feedback and previous_answer)
    system_prompt = REGENERATE_SYSTEM_PROMPT if is_regen else GENERATE_SYSTEM_PROMPT

    user_prompt = _build_user_prompt(
        question, job_analysis, resume_structured, rag_results,
        char_limit, feedback, previous_answer, company_research, resume_raw_text,
    )

    max_attempts = 3 if char_limit else 1
    answer = ""

    for attempt in range(max_attempts):
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ]

        # 재시도 시 직전 결과와 현재 글자수를 피드백으로 추가
        if attempt > 0 and answer and char_limit:
            actual = len(answer)
            min_chars = int(char_limit * 0.9)
            messages.append({"role": "assistant", "content": answer})
            messages.append({
                "role": "user",
                "content": (
                    f"방금 작성한 답변은 {actual}자입니다. "
                    f"목표 글자수 {char_limit}자의 90%~100% 범위({min_chars}~{char_limit}자)를 벗어났습니다. "
                    f"내용의 핵심은 유지하면서 글자수를 {min_chars}~{char_limit}자 사이로 맞춰 다시 작성하세요."
                ),
            })

        response = openai_client.chat.completions.create(
            model="gpt-4o",
            messages=messages,
            temperature=0.3,
        )
        answer = response.choices[0].message.content.strip()

        if not char_limit:
            break

        actual = len(answer)
        min_chars = int(char_limit * 0.9)
        if min_chars <= actual <= char_limit:
            break

    return answer


def _build_user_prompt(
    question: str,
    job_analysis: dict,
    resume_structured: dict,
    rag_results: list[dict],
    char_limit: int | None,
    feedback: str | None,
    previous_answer: str | None,
    company_research: dict | None = None,
    resume_raw_text: str | None = None,
) -> str:
    """생성 프롬프트를 구성한다. 재생성 시 피드백을 상단에 배치한다."""
    parts = []

    # 재생성: 피드백 + 이전 답변을 최상단에
    if feedback and previous_answer:
        parts.append("## ⚠️ 개선 지시 (최우선 반영)")
        parts.append("아래 피드백은 실제 채용 담당자 9명이 이전 답변을 보고 남긴 평가입니다.")
        parts.append("각 항목을 빠짐없이 반영해서 재작성하세요.\n")
        parts.append(feedback)
        parts.append(f"\n## 이전 답변 (위 피드백의 대상)")
        parts.append(previous_answer)
        parts.append("\n---")

    # 자소서 질문
    parts.append(f"\n## 자소서 질문\n{question}")
    if char_limit:
        min_chars = int(char_limit * 0.9)
        parts.append(f"(글자수 제한: {char_limit}자 — 반드시 {min_chars}자 이상 {char_limit}자 이하로 작성하세요)")

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

    # 회사 조사 결과
    if company_research and any(company_research.get(k) for k in ("mission", "vision", "products_services")):
        parts.append(f"\n## 회사 정보 (지원동기·비전 작성에 활용)")
        if company_research.get("mission"):
            parts.append(f"- 미션: {company_research['mission']}")
        if company_research.get("vision"):
            parts.append(f"- 비전: {company_research['vision']}")
        if company_research.get("products_services"):
            parts.append(f"- 주요 제품/서비스: {company_research['products_services']}")

    # 이력서 정보
    parts.append(f"\n## 내 이력서")
    if resume_raw_text:
        parts.append("### 이력서 원문 (이것이 사실의 기준입니다 — 원문에 없는 학위·기술·경험은 절대 작성 금지)")
        parts.append(resume_raw_text[:5000])
        parts.append("\n### 구조화 요약")
    parts.append(_resume_to_text(resume_structured))

    # RAG 참고 자소서
    parts.append(f"\n## 참고할 합격 자소서")
    parts.append("⚠️ 아래는 문체·구조·톤 참고 전용입니다. 아래에 나오는 회사명, 프로젝트명, 자격증, 수치, 직무 경험은 다른 사람의 것이므로 절대 내 경험인 것처럼 사용하지 마세요.")
    for i, r in enumerate(rag_results[:3]):
        child = r["child"]
        parts.append(f"\n### 참고 {i+1} (유사도: {child.get('similarity', 0):.2f}) — 문체/구조만 참고, 내용 사용 금지")
        parts.append(child.get("answer", ""))

    # 최종 지시
    if feedback and previous_answer:
        parts.append(f"\n## 작성 지시")
        parts.append(
            "위 [개선 지시]의 모든 항목을 반영해서 자소서를 재작성하세요. "
            "이전 답변에서 피드백 없는 강점은 유지하고, 지적된 부분만 집중적으로 개선하세요."
        )
    else:
        parts.append(f"\n## 작성 지시")
        parts.append(
            "위 [내 이력서]에 있는 실제 경험만을 사용하여 자소서를 작성하세요. "
            "참고 자소서의 문체와 구조는 참고하되, 참고 자소서에 등장하는 경험·회사·수치는 절대 사용하지 마세요. "
            "이력서에 없는 내용은 지어내지 말고, 있는 경험을 채용공고에 맞게 연결하세요."
        )

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
