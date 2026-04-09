"""Supabase 벡터 유사도 검색 — Child 검색 후 Parent 컨텍스트 함께 반환"""

import asyncio
import os
from pathlib import Path

from dotenv import load_dotenv
from openai import AsyncOpenAI
from supabase import create_client

load_dotenv(Path(__file__).parent.parent / ".env")

openai_client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))
supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))


async def get_embedding(text: str) -> list[float]:
    """텍스트를 임베딩 벡터로 변환한다."""
    response = await openai_client.embeddings.create(
        model="text-embedding-3-small",
        input=text[:8000],
    )
    return response.data[0].embedding


async def search_similar(query: str, match_count: int = 5, threshold: float = 0.3) -> list[dict]:
    """쿼리와 유사한 Child 청크를 검색하고, Parent 컨텍스트를 함께 반환한다."""
    query_embedding = await get_embedding(query)

    # Child 청크에서 유사도 검색 (match_documents RPC 함수 사용)
    result = await asyncio.to_thread(lambda: supabase.rpc("match_documents", {
        "query_embedding": query_embedding,
        "match_threshold": threshold,
        "match_count": match_count,
    }).execute())

    children = result.data or []

    # 고유 parent_id 목록 수집 후 한 번에 병렬 조회
    parent_ids_needed = set()
    child_parent_map: dict[int, int | None] = {}
    for child in children:
        pid = await asyncio.to_thread(
            lambda cid=child["id"]: supabase.table("documents").select("parent_id").eq("id", cid).single().execute()
        )
        parent_id = pid.data["parent_id"] if pid.data else None
        child_parent_map[child["id"]] = parent_id
        if parent_id is not None:
            parent_ids_needed.add(parent_id)

    # 부모 컨텍스트 병렬 조회
    parent_cache: dict[int, str] = {}
    if parent_ids_needed:
        async def _fetch_parent(pid: int) -> tuple[int, str]:
            res = await asyncio.to_thread(
                lambda: supabase.table("documents").select("answer").eq("id", pid).single().execute()
            )
            return pid, (res.data["answer"] if res.data else "")

        results = await asyncio.gather(*[_fetch_parent(pid) for pid in parent_ids_needed])
        parent_cache = dict(results)

    enriched = []
    for child in children:
        parent_id = child_parent_map.get(child["id"])
        enriched.append({
            "child": child,
            "parent_context": parent_cache.get(parent_id, "") if parent_id else "",
        })

    return enriched


async def search_by_question_type(query: str, question_type: str, match_count: int = 3, threshold: float = 0.3) -> list[dict]:
    """질문 유형으로 필터링하여 유사 청크를 검색한다."""
    all_results = await search_similar(query, match_count=match_count * 3, threshold=threshold)

    filtered = [
        r for r in all_results
        if r["child"].get("question_type") == question_type
    ]

    return filtered[:match_count] if filtered else all_results[:match_count]
