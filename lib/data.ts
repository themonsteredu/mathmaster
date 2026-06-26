export type DBProblem = {
  id: string;
  student_name: string;
  problem_image_url: string;
  subject: string | null;
  unit: string | null;
  target_count: number;
  done_count: number;
  status: string;
  uploaded_by: string;
  created_at: string;
};

export type DBStudent = {
  id: string;
  name: string;
  grade: string | null;
  created_at: string;
};

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
