-- 010_soft_delete_projects.sql
-- 프로젝트 소프트 삭제: 버전 행을 유지해 월별 사용량 카운트 보존
ALTER TABLE generations ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
