-- Migration 003: companies 임베딩 유사도 검색 RPC 함수
-- 실행 환경: Supabase SQL Editor

CREATE OR REPLACE FUNCTION match_companies(
    query_embedding vector(1536),
    match_threshold float,
    match_count int
)
RETURNS TABLE (
    id               int,
    name             text,
    name_normalized  text,
    mission          text,
    vision           text,
    products_services text,
    created_at       timestamptz,
    similarity       float
)
LANGUAGE sql STABLE
AS $$
    SELECT
        id,
        name,
        name_normalized,
        mission,
        vision,
        products_services,
        created_at,
        1 - (name_embedding <=> query_embedding) AS similarity
    FROM companies
    WHERE name_embedding IS NOT NULL
      AND 1 - (name_embedding <=> query_embedding) > match_threshold
    ORDER BY name_embedding <=> query_embedding
    LIMIT match_count;
$$;
