-- profiles 테이블에 생년월일 컬럼 추가
alter table public.profiles
  add column if not exists birth_date date;
