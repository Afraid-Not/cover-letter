"""채용공고 텍스트 → 요구 역량/키워드 추출"""

import json
import os
from pathlib import Path

from dotenv import load_dotenv
from openai import OpenAI

load_dotenv(Path(__file__).parent.parent / ".env")

openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

ANALYZE_SYSTEM_PROMPT = """당신은 채용공고 분석 전문가입니다.
주어진 채용공고 텍스트를 분석하여 다음 정보를 JSON으로 추출하세요.

{
  "company": "회사명",
  "position": "직무/포지션",
  "required_skills": ["필수 기술/역량"],
  "preferred_skills": ["우대 기술/역량"],
  "responsibilities": ["주요 업무"],
  "keywords": ["채용공고에서 반복/강조되는 핵심 키워드"],
  "culture_keywords": ["조직���화/인재상 관련 키워드"],
  "experience_level": "경력 수준 (신입/경력/무관)"
}

- 채용공고에 명시되지 않은 항목은 빈 배열 또는 빈 문자열로 남기세요.
- keywords는 자소서 작성에 반영해야 할 핵심 단어를 추출하세요.
- JSON만 출력하세요."""


def analyze_job_posting(text: str) -> dict:
    """채용공고 텍스트에서 요구 역량과 키워드를 추출한다."""
    response = openai_client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": ANALYZE_SYSTEM_PROMPT},
            {"role": "user", "content": text[:10000]},
        ],
        response_format={"type": "json_object"},
        temperature=0,
    )
    return json.loads(response.choices[0].message.content)


def build_search_query(job_analysis: dict, question: str) -> str:
    """채용공고 분석 결과 + 자소서 질문으로 RAG 검색 쿼리를 구성한다."""
    parts = [f"질문: {question}"]

    if job_analysis.get("position"):
        parts.append(f"직무: {job_analysis['position']}")

    skills = job_analysis.get("required_skills", []) + job_analysis.get("preferred_skills", [])
    if skills:
        parts.append(f"요구 역량: {', '.join(skills[:10])}")

    keywords = job_analysis.get("keywords", [])
    if keywords:
        parts.append(f"핵심 키워드: {', '.join(keywords[:10])}")

    return "\n".join(parts)
