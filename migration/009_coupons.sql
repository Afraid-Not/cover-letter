-- 009_coupons.sql
-- profiles에 extra_generations 컬럼 추가
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS extra_generations INT NOT NULL DEFAULT 0;

-- coupons 테이블 생성 (1인 1회 사용)
CREATE TABLE IF NOT EXISTS coupons (
  code                 TEXT PRIMARY KEY,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at           TIMESTAMPTZ NOT NULL,
  bonus_generations    INT NOT NULL DEFAULT 5,
  bonus_regenerations  INT NOT NULL DEFAULT 25,
  used_by              UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  used_at              TIMESTAMPTZ
);

-- 기존 테이블에 컬럼 추가 (이미 생성된 경우)
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS bonus_generations   INT NOT NULL DEFAULT 5;
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS bonus_regenerations INT NOT NULL DEFAULT 25;

-- RLS 활성화 (API는 service role key로 bypass)
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;

-- 유저는 직접 조회 불가 (API 통해서만)
DROP POLICY IF EXISTS "coupons_no_direct_access" ON coupons;
CREATE POLICY "coupons_no_direct_access" ON coupons
  FOR ALL TO authenticated USING (false);
