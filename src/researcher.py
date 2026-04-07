"""회사 정보 조회 — 캐시(companies 테이블) 우선, 미스 시 web search 후 저장"""

import json
import os
import re
import unicodedata
from pathlib import Path

from dotenv import load_dotenv
from openai import OpenAI
from supabase import create_client

load_dotenv(Path(__file__).parent.parent / ".env")

_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
_supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))

_SIMILARITY_THRESHOLD = 0.92

_RESEARCH_PROMPT = """{company} 회사에 대해 다음 세 가지 정보를 조사해줘:
1. 미션(Mission): 이 회사가 존재하는 이유, 핵심 목적
2. 비전(Vision): 이 회사가 지향하는 미래 목표
3. 주요 제품/서비스: 이 회사가 판매하거나 제공하는 핵심 제품과 서비스

반드시 아래 JSON 형식으로만 답변해. 설명 없이 JSON만 출력해:
{{
  "mission": "...",
  "vision": "...",
  "products_services": "..."
}}

정보를 찾을 수 없으면 해당 필드에 null을 넣어줘."""


def _normalize(name: str) -> str:
    """회사명 정규화: NFKC 유니코드 정규화 → 소문자 → 영숫자·한글만 유지"""
    name = unicodedata.normalize("NFKC", name).lower()
    return re.sub(r"[^a-z0-9가-힣]", "", name)


def _get_embedding(text: str) -> list[float]:
    response = _client.embeddings.create(
        model="text-embedding-3-small",
        input=text[:500],
    )
    return response.data[0].embedding


def _find_cached(name: str) -> dict | None:
    """1단계 정규화 완전 일치 → 2단계 임베딩 유사도 순으로 캐시 조회"""
    normalized = _normalize(name)

    # 1단계: 정규화 완전 일치
    exact = _supabase.table("companies").select("*").eq("name_normalized", normalized).limit(1).execute()
    if exact.data:
        return exact.data[0]

    # 2단계: 임베딩 유사도 (match_companies RPC)
    try:
        embedding = _get_embedding(name)
        similar = _supabase.rpc("match_companies", {
            "query_embedding": embedding,
            "match_threshold": _SIMILARITY_THRESHOLD,
            "match_count": 1,
        }).execute()
        if similar.data:
            return similar.data[0]
    except Exception:
        pass

    return None


def _research_web(company: str) -> dict:
    """OpenAI web search로 회사 미션/비전/제품·서비스를 조사한다."""
    try:
        response = _client.responses.create(
            model="gpt-4o",
            tools=[{"type": "web_search_preview"}],
            input=_RESEARCH_PROMPT.format(company=company),
        )
        raw = response.output_text.strip()
        match = re.search(r"\{[\s\S]*\}", raw)
        if match:
            data = json.loads(match.group())
            return {
                "mission": data.get("mission"),
                "vision": data.get("vision"),
                "products_services": data.get("products_services"),
            }
    except Exception:
        pass
    return {"mission": None, "vision": None, "products_services": None}


def _save_company(name: str, research: dict) -> dict:
    """회사 정보를 companies 테이블에 저장하고 row를 반환한다."""
    normalized = _normalize(name)
    embedding = _get_embedding(name)

    result = _supabase.table("companies").insert({
        "name": name,
        "name_normalized": normalized,
        "name_embedding": embedding,
        "mission": research.get("mission"),
        "vision": research.get("vision"),
        "products_services": research.get("products_services"),
    }).execute()
    return result.data[0]


def get_or_research_company(name: str) -> dict | None:
    """캐시 조회 후 없으면 웹서치 → 저장. companies row를 반환한다."""
    if not name or name in ("미확인", ""):
        return None

    cached = _find_cached(name)
    if cached:
        return cached

    research = _research_web(name)
    try:
        return _save_company(name, research)
    except Exception:
        return None
