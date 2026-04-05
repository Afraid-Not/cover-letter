"""Supabase 벡터 유사도 검색 — Child 검색 후 Parent 컨텍스트 함께 반환"""

import os
from pathlib import Path

from dotenv import load_dotenv
from openai import OpenAI
from supabase import create_client

load_dotenv(Path(__file__).parent.parent / ".env")

openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))


def get_embedding(text: str) -> list[float]:
    """텍스트를 임베딩 벡터로 변환한다."""
    response = openai_client.embeddings.create(
        model="text-embedding-3-small",
        input=text[:8000],
    )
    return response.data[0].embedding


def search_similar(query: str, match_count: int = 5, threshold: float = 0.3) -> list[dict]:
    """쿼리와 유사한 Child 청크를 검색하고, Parent 컨텍스트를 함께 반환한다."""
    query_embedding = get_embedding(query)

    # Child 청크에서 유사도 검색 (match_documents RPC 함수 사용)
    result = supabase.rpc("match_documents", {
        "query_embedding": query_embedding,
        "match_threshold": threshold,
        "match_count": match_count,
    }).execute()

    children = result.data or []

    # 각 Child의 Parent 컨텍스트를 가져옴
    enriched = []
    parent_cache = {}
    for child in children:
        parent_id = _get_parent_id(child["id"])
        if parent_id and parent_id not in parent_cache:
            parent_result = supabase.table("documents").select("answer").eq("id", parent_id).single().execute()
            parent_cache[parent_id] = parent_result.data["answer"] if parent_result.data else ""

        enriched.append({
            "child": child,
            "parent_context": parent_cache.get(parent_id, ""),
        })

    return enriched


def _get_parent_id(child_id: int) -> int | None:
    """Child의 parent_id를 조회한다."""
    result = supabase.table("documents").select("parent_id").eq("id", child_id).single().execute()
    return result.data["parent_id"] if result.data else None


def search_by_question_type(query: str, question_type: str, match_count: int = 3, threshold: float = 0.3) -> list[dict]:
    """질문 유형으로 필터링하여 유사 청크를 검색한다."""
    all_results = search_similar(query, match_count=match_count * 3, threshold=threshold)

    filtered = [
        r for r in all_results
        if r["child"].get("question_type") == question_type
    ]

    return filtered[:match_count] if filtered else all_results[:match_count]
