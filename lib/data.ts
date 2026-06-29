export type DBProblem = {
  id: string;
  student_name: string;
  problem_image_url: string;
  cleaned_image_url: string | null;
  subject: string | null;
  unit: string | null;
  type_code: string | null; // 오답 유형 코드 (예: 4-2-1-03) — 약점 집계용
  type_name: string | null; // 오답 유형명
  seq: number | null; // 학생별 고정 문항 번호 (삭제돼도 유지, 빈 번호 재사용)
  answer: string | null; // 정답 (채점용, 시험지엔 안 나옴)
  target_count: number; // 최대 반복(출제) 횟수
  done_count: number;
  status: string; // 대기 / 경고 (옛 데이터: 학습중 / 완료)
  attempts: number; // 지금까지 출제·재출제된 횟수
  due_date: string | null; // 다음 출제 예정일 (yyyy-mm-dd)
  last_submitted_at: string | null; // 학생이 풀이를 마지막으로 올린 시각
  uploaded_by: string;
  created_at: string;
};

// 망각곡선 간격(일): 1 → 3 → 7 → 14 → 30
export const REVIEW_INTERVALS = [1, 3, 7, 14, 30];

/** 오늘 기준 n일 뒤 날짜 (yyyy-mm-dd) */
export function isoAddDays(n: number): string {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export function todayISO(): string {
  return isoAddDays(0);
}

/** attempts번째 사이클의 다음 출제 예정일 */
export function nextDue(attempts: number): string {
  const gap = REVIEW_INTERVALS[Math.min(attempts, REVIEW_INTERVALS.length - 1)];
  return isoAddDays(gap);
}

/** 화면에 보여줄 문제 사진 — 보정본이 있으면 그것, 없으면 원본 */
export function problemImage(p: DBProblem): string {
  return p.cleaned_image_url || p.problem_image_url;
}

export type DBStudent = {
  id: string;
  name: string;
  grade: string | null;
  attend_days: string | null; // "1,3,5" = 월·수·금 (0=일 … 6=토)
  created_at: string;
};

// 요일: 화면 표시는 월~일 순서
export const DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];
export const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0]; // 월화수목금토일

export function parseDays(s: string | null): number[] {
  if (!s) return [];
  return s.split(",").map((x) => Number(x)).filter((n) => !isNaN(n));
}
export function serializeDays(arr: number[]): string {
  return [...new Set(arr)].sort((a, b) => a - b).join(",");
}

/** 표시용 상태 키: 완료 / 신규(아직 한 번도 안 풂) / 학습중 */
export function statusKey(p: DBProblem): "done" | "new" | "study" {
  if (p.status === "완료") return "done";
  if (p.done_count === 0) return "new";
  return "study";
}

/** 카드 큰 제목 */
export function problemTitle(p: DBProblem): string {
  return p.unit || p.subject || "오답 문제";
}

/** 카드 작은 설명(과목·단원) */
export function problemTopic(p: DBProblem): string {
  return [p.subject, p.unit].filter(Boolean).join(" · ") || "과목 미지정";
}

/** 한 학생의 문제 묶음 요약 */
export function summarize(problems: DBProblem[]) {
  const study = problems.filter((p) => statusKey(p) === "study").length;
  const done = problems.filter((p) => statusKey(p) === "done").length;
  const fresh = problems.filter((p) => statusKey(p) === "new").length;
  const totalDone = problems.reduce((a, p) => a + p.done_count, 0);
  const totalTarget = problems.reduce((a, p) => a + p.target_count, 0);
  const progress = totalTarget > 0 ? Math.round((totalDone / totalTarget) * 100) : 0;
  return { study, done, fresh, total: problems.length, totalDone, progress };
}
