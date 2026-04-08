-- Migration 004: profiles 테이블 생성 + plan 컬럼 + is_regeneration 컬럼
-- 실행 환경: Supabase SQL Editor

-- 1. profiles 테이블 생성 (plan 컬럼 포함)
CREATE TABLE IF NOT EXISTS profiles (
    user_id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name                 TEXT NOT NULL,
    phone                TEXT,
    job_title            TEXT,
    job_embedding        vector(1536),
    job_seeker_status    TEXT,          -- '신입' | '경력'
    years_of_experience  INTEGER,
    education_level      TEXT,          -- '학사' | '석사' | '박사' | '전문학사'
    education_major      TEXT,
    agreed_to_terms      BOOLEAN NOT NULL DEFAULT false,
    plan                 TEXT NOT NULL DEFAULT 'free'
                         CHECK (plan IN ('free', 'pro', 'enterprise')),
    created_at           TIMESTAMPTZ DEFAULT now(),
    updated_at           TIMESTAMPTZ DEFAULT now()
);

-- 2. 이미 테이블이 있는 경우 plan 컬럼만 추가
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'free'
    CHECK (plan IN ('free', 'pro', 'enterprise'));

-- 3. RLS 활성화
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 4. RLS 정책: 본인 데이터만 접근 가능
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'profiles: 본인만 읽기') THEN
    CREATE POLICY "profiles: 본인만 읽기" ON profiles FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'profiles: 본인만 쓰기') THEN
    CREATE POLICY "profiles: 본인만 쓰기" ON profiles FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- 5. generations 테이블: is_regeneration 컬럼 추가
ALTER TABLE generations ADD COLUMN IF NOT EXISTS is_regeneration BOOLEAN NOT NULL DEFAULT false;
