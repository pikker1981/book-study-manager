-- Book Study Manager Supabase schema
-- 실행 위치: Supabase Dashboard > SQL Editor
-- 중요: 아래 ADMIN_EMAIL 값을 실제 관리자 이메일로 바꾼 뒤 실행하세요.

-- UUID 생성을 위한 확장. 대부분의 Supabase 프로젝트에서 사용 가능합니다.
create extension if not exists pgcrypto;

-- 기존 테스트 테이블을 재생성하려면 아래 drop 문 주석을 해제하세요.
-- drop table if exists attendance cascade;
-- drop table if exists meetings cascade;
-- drop table if exists members cascade;
-- drop table if exists books cascade;

create table if not exists books (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  author text not null,
  cover_image text,
  start_date date,
  end_date date,
  status text not null default 'reading' check (status in ('reading', 'finished')),
  memo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  memo text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  joined_at date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists meetings (
  id uuid primary key default gen_random_uuid(),
  book_id uuid references books(id) on delete set null,
  title text not null,
  meeting_date date not null,
  meeting_time time,
  location text,
  memo text,
  transcript text,
  summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists attendance (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references meetings(id) on delete cascade,
  member_id uuid not null references members(id) on delete cascade,
  status text not null default 'pending' check (status in ('attend', 'absent', 'pending')),
  memo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (meeting_id, member_id)
);

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_books_updated_at on books;
create trigger trg_books_updated_at before update on books
for each row execute function set_updated_at();

drop trigger if exists trg_members_updated_at on members;
create trigger trg_members_updated_at before update on members
for each row execute function set_updated_at();

drop trigger if exists trg_meetings_updated_at on meetings;
create trigger trg_meetings_updated_at before update on meetings
for each row execute function set_updated_at();

drop trigger if exists trg_attendance_updated_at on attendance;
create trigger trg_attendance_updated_at before update on attendance
for each row execute function set_updated_at();

alter table books enable row level security;
alter table members enable row level security;
alter table meetings enable row level security;
alter table attendance enable row level security;

-- 관리자 이메일을 반드시 실제 로그인 이메일로 교체하세요.
-- 예: auth.jwt() ->> 'email' = 'myname@gmail.com'

drop policy if exists "admin can read books" on books;
create policy "admin can read books" on books
for select to authenticated
using (auth.jwt() ->> 'email' = 'ADMIN_EMAIL');

drop policy if exists "admin can write books" on books;
create policy "admin can write books" on books
for all to authenticated
using (auth.jwt() ->> 'email' = 'ADMIN_EMAIL')
with check (auth.jwt() ->> 'email' = 'ADMIN_EMAIL');

drop policy if exists "admin can read members" on members;
create policy "admin can read members" on members
for select to authenticated
using (auth.jwt() ->> 'email' = 'ADMIN_EMAIL');

drop policy if exists "admin can write members" on members;
create policy "admin can write members" on members
for all to authenticated
using (auth.jwt() ->> 'email' = 'ADMIN_EMAIL')
with check (auth.jwt() ->> 'email' = 'ADMIN_EMAIL');

drop policy if exists "admin can read meetings" on meetings;
create policy "admin can read meetings" on meetings
for select to authenticated
using (auth.jwt() ->> 'email' = 'ADMIN_EMAIL');

drop policy if exists "admin can write meetings" on meetings;
create policy "admin can write meetings" on meetings
for all to authenticated
using (auth.jwt() ->> 'email' = 'ADMIN_EMAIL')
with check (auth.jwt() ->> 'email' = 'ADMIN_EMAIL');

drop policy if exists "admin can read attendance" on attendance;
create policy "admin can read attendance" on attendance
for select to authenticated
using (auth.jwt() ->> 'email' = 'ADMIN_EMAIL');

drop policy if exists "admin can write attendance" on attendance;
create policy "admin can write attendance" on attendance
for all to authenticated
using (auth.jwt() ->> 'email' = 'ADMIN_EMAIL')
with check (auth.jwt() ->> 'email' = 'ADMIN_EMAIL');

-- 선택: 샘플 데이터. 필요 없으면 실행하지 않아도 됩니다.
-- insert into books (title, author, start_date, end_date, status, memo)
-- values ('지구 끝의 온실', '김초엽', '2026-05-01', '2026-05-31', 'reading', '5월 독서모임 선정 도서');

-- Data API 권한. RLS가 실제 접근 범위를 제한합니다.
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on books to authenticated;
grant select, insert, update, delete on members to authenticated;
grant select, insert, update, delete on meetings to authenticated;
grant select, insert, update, delete on attendance to authenticated;
