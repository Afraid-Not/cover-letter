-- 고객센터 답변 테이블
create table if not exists support_replies (
  id bigint generated always as identity primary key,
  ticket_id bigint not null references support_tickets(id) on delete cascade,
  sender_type text not null check (sender_type in ('admin', 'user')),
  content text not null,
  created_at timestamptz not null default now()
);

-- RLS 활성화
alter table support_replies enable row level security;

-- 본인 문의의 답변만 조회 가능
create policy "users can read replies for own tickets"
  on support_replies for select
  using (
    exists (
      select 1 from support_tickets
      where support_tickets.id = support_replies.ticket_id
        and support_tickets.user_id = auth.uid()
    )
  );

-- 관리자는 service_role로 접근 (RLS 우회)
