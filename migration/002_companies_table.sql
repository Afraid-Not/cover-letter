-- Migration 002: companies 테이블 추가 + generations.company_research → company_id FK 전환
-- 실행 환경: Supabase SQL Editor

-- 1. companies 테이블 생성
CREATE TABLE IF NOT EXISTS companies (
    id               SERIAL PRIMARY KEY,
    name             TEXT NOT NULL,
    name_normalized  TEXT NOT NULL,
    name_embedding   vector(1536),
    mission          TEXT,
    vision           TEXT,
    products_services TEXT,
    created_at       TIMESTAMPTZ DEFAULT now()
);

-- 2. 유사도 검색용 인덱스 (pgvector IVFFlat)
CREATE INDEX IF NOT EXISTS companies_embedding_idx
    ON companies USING ivfflat (name_embedding vector_cosine_ops)
    WITH (lists = 10);

-- 3. 정규화명 중복 방지 인덱스
CREATE UNIQUE INDEX IF NOT EXISTS companies_name_normalized_idx
    ON companies (name_normalized);

-- 4. generations 테이블: company_research 제거, company_id FK 추가
ALTER TABLE generations DROP COLUMN IF EXISTS company_research;
ALTER TABLE generations ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id);
