-- 011_company_search_credits.sql
-- profiles에 extra_company_searches 컬럼 추가 (free 유저 회사 검색 크레딧)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS extra_company_searches INT NOT NULL DEFAULT 0;

-- coupons에 bonus_company_searches 컬럼 추가
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS bonus_company_searches INT NOT NULL DEFAULT 0;
