-- Migration 007: 관리자 시스템
-- 1. profiles에 role, extra_regenerations 컬럼 추가
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user'
    CHECK (role IN ('user', 'admin'));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS extra_regenerations INTEGER NOT NULL DEFAULT 0;

-- 2. app_settings 테이블 (플랜 on/off 등 글로벌 설정)
CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL DEFAULT 'true',
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. 기본 설정값 삽입
INSERT INTO app_settings (key, value) VALUES
    ('plan_free_enabled',       'true'),
    ('plan_pro_enabled',        'true'),
    ('plan_enterprise_enabled', 'true')
ON CONFLICT (key) DO NOTHING;

-- 4. RLS: app_settings는 service_role만 write (백엔드에서만 수정)
--    프론트에서 직접 읽지 않으므로 별도 public 정책 없음
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
