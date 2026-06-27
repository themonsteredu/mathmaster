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

-- ============================================================
-- [추가] 학생 명단 표  (이름을 미리 등록해두고 골라 쓰기 위함)
-- 이 부분만 따로 SQL Editor에 붙여넣고 RUN 해도 됩니다.
-- ============================================================
create table if not exists students (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,                 -- 학생 이름
  grade      text,                          -- 학년/반 (선택)
  created_at timestamptz not null default now()
);

alter table students enable row level security;
drop policy if exists "allow all - students" on students;
create policy "allow all - students" on students for all using (true) with check (true);

-- ============================================================
-- [추가] 낙서 지운 보정본 사진 주소 칸
-- 이 한 줄만 SQL Editor에 붙여넣고 RUN 하세요.
-- ============================================================
alter table wrong_problems add column if not exists cleaned_image_url text;

-- ============================================================
-- [추가] 간격 반복(망각곡선) 스케줄 칸
-- 아래 두 줄을 SQL Editor에 붙여넣고 RUN 하세요.
-- ============================================================
alter table wrong_problems add column if not exists attempts integer not null default 0;
alter table wrong_problems add column if not exists due_date date;

-- ============================================================
-- [추가] 학생별 고정 문항 번호(seq) — 삭제돼도 번호 유지
-- 아래 전체를 SQL Editor에 붙여넣고 RUN 하세요.
-- (기존 문항들도 학생별 등록순 1,2,3...으로 번호가 채워집니다)
-- ============================================================
alter table wrong_problems add column if not exists seq integer;

with ranked as (
  select id, row_number() over (partition by student_name order by created_at) as rn
  from wrong_problems
)
update wrong_problems w
set seq = r.rn
from ranked r
where w.id = r.id and w.seq is null;

-- ============================================================
-- [추가] 정답(채점용) 칸
-- 아래 한 줄을 SQL Editor에 붙여넣고 RUN 하세요.
-- ============================================================
alter table wrong_problems add column if not exists answer text;

-- ============================================================
-- [추가] 학생 풀이 제출 시각 (디지털 풀이 업로드용)
-- 아래 한 줄을 SQL Editor에 붙여넣고 RUN 하세요.
-- ============================================================
alter table wrong_problems add column if not exists last_submitted_at timestamptz;

-- ============================================================
-- [추가] AI 사용 기록 (낙서 지우기 / 단원 인식 호출 횟수)
-- 아래 전체를 SQL Editor에 붙여넣고 RUN 하세요.
-- ============================================================
create table if not exists ai_usage (
  id         uuid primary key default gen_random_uuid(),
  kind       text not null,            -- clean(낙서지우기) / unit(단원인식)
  created_at timestamptz not null default now()
);
alter table ai_usage enable row level security;
drop policy if exists "allow all - ai_usage" on ai_usage;
create policy "allow all - ai_usage" on ai_usage for all using (true) with check (true);

-- ============================================================
-- [추가] 완료 기록 (레포트용) — 완료(삭제) 시 기록을 남김
-- 아래 전체를 SQL Editor에 붙여넣고 RUN 하세요.
-- ============================================================
create table if not exists completions (
  id           uuid primary key default gen_random_uuid(),
  student_name text not null,
  unit         text,
  attempts     integer not null default 0,
  completed_at timestamptz not null default now()
);
alter table completions enable row level security;
drop policy if exists "allow all - completions" on completions;
create policy "allow all - completions" on completions for all using (true) with check (true);

-- ============================================================
-- [추가] 학생 등원 요일 (예: "1,3,5" = 월·수·금)
-- 아래 한 줄을 SQL Editor에 붙여넣고 RUN 하세요.
-- ============================================================
alter table students add column if not exists attend_days text;

-- ============================================================
-- [추가] 기출 시험지 보관함
-- 아래 전체를 SQL Editor에 붙여넣고 RUN 하세요.
-- ============================================================
create table if not exists exam_papers (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  category   text,
  image_url  text not null,
  created_at timestamptz not null default now()
);
alter table exam_papers enable row level security;
drop policy if exists "allow all - exam_papers" on exam_papers;
create policy "allow all - exam_papers" on exam_papers for all using (true) with check (true);
