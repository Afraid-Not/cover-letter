-- ── 1. profiles 테이블에 컬럼 추가 ──
alter table public.profiles
  add column if not exists avatar_url text;

alter table public.profiles
  add column if not exists bio text;

-- ── 2. avatars 버킷 생성 (이미 있으면 무시) ──
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- ── 3. RLS 정책 (기존 정책 삭제 후 재생성) ──
drop policy if exists "avatars_public_read"   on storage.objects;
drop policy if exists "avatars_owner_insert"  on storage.objects;
drop policy if exists "avatars_owner_update"  on storage.objects;
drop policy if exists "avatars_owner_delete"  on storage.objects;

-- 조회: 누구나 읽기 가능 (public 버킷)
create policy "avatars_public_read"
  on storage.objects for select
  using (bucket_id = 'avatars');

-- 업로드: 로그인한 사용자가 자신의 폴더에만 업로드
create policy "avatars_owner_insert"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- 수정: 본인 파일만
create policy "avatars_owner_update"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- 삭제: 본인 파일만
create policy "avatars_owner_delete"
  on storage.objects for delete
  using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
