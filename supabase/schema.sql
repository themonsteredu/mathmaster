-- ============================================================
-- 오답 반복학습 앱 - 데이터베이스 설계도
-- Supabase의 SQL Editor에 이 전체를 붙여넣고 RUN 하세요.
-- (표 2개 + 사진 보관함 + 권한 설정이 한 번에 만들어집니다)
-- ============================================================

-- 1) 오답문제 표 -------------------------------------------------
create table if not exists wrong_problems (
  id                uuid primary key default gen_random_uuid(),
  student_name      text not null,                 -- 학생이름
  problem_image_url text not null,                 -- 문제사진 주소
  subject           text,                          -- 과목
  unit              text,                          -- 단원
  target_count      integer not null default 3,    -- 목표횟수 (기본 3)
  done_count        integer not null default 0,    -- 완료횟수 (기본 0)
  status            text    not null default '학습중', -- 상태: 학습중 / 완료
  uploaded_by       text    not null default '선생님',  -- 올린사람: 학생 / 선생님
  created_at        timestamptz not null default now() -- 등록일
);

-- 2) 풀이기록 표 -------------------------------------------------
create table if not exists solution_logs (
  id                 uuid primary key default gen_random_uuid(),
  problem_id         uuid not null references wrong_problems(id) on delete cascade, -- 어떤 오답문제인지 연결
  solution_image_url text not null,                  -- 풀이사진 주소
  solved_at          timestamptz not null default now() -- 푼날짜
);

-- 3) 권한 설정 (앱이 표를 읽고 쓸 수 있게) ----------------------
alter table wrong_problems enable row level security;
alter table solution_logs  enable row level security;

drop policy if exists "allow all - wrong_problems" on wrong_problems;
create policy "allow all - wrong_problems" on wrong_problems
  for all using (true) with check (true);

drop policy if exists "allow all - solution_logs" on solution_logs;
create policy "allow all - solution_logs" on solution_logs
  for all using (true) with check (true);

-- 4) 사진 보관함(Storage 버킷) 만들기 --------------------------
insert into storage.buckets (id, name, public)
values ('problem-photos', 'problem-photos', true)
on conflict (id) do nothing;

-- 사진 보관함 권한 (앱이 사진을 올리고 볼 수 있게)
drop policy if exists "allow all - photos" on storage.objects;
create policy "allow all - photos" on storage.objects
  for all using (bucket_id = 'problem-photos') with check (bucket_id = 'problem-photos');
