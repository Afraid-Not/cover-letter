-- 고객센터 문의 테이블
create table if not exists support_tickets (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete set null,
  email text,
  category text not null check (category in ('complaint', 'suggestion', 'general')),
  title text not null,
  content text not null,
  status text not null default 'open' check (status in ('open', 'in_progress', 'closed')),
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- RLS 활성화
alter table support_tickets enable row level security;

-- 본인 문의 조회 (로그인 유저)
create policy "users can read own tickets"
  on support_tickets for select
  using (auth.uid() = user_id);

-- 문의 등록 (로그인 유저 + 비로그인 모두 허용은 anon key로 제한하므로 인증 유저만)
create policy "users can insert tickets"
  on support_tickets for insert
  with check (auth.uid() = user_id);

-- 관리자는 service_role로 접근 (RLS 우회)

-- updated_at 자동 갱신 트리거
create or replace function update_support_tickets_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_support_tickets_updated_at
  before update on support_tickets
  for each row execute function update_support_tickets_updated_at();
