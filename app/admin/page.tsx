"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Problem = {
  id: string;
  student_name: string;
  problem_image_url: string;
  subject: string | null;
  unit: string | null;
  target_count: number;
  done_count: number;
  status: string;
  created_at: string;
};

type SolutionLog = {
  id: string;
  problem_id: string;
  solution_image_url: string;
  solved_at: string;
};

export default function AdminPage() {
  const [loading, setLoading] = useState(true);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [error, setError] = useState("");
  const [student, setStudent] = useState("전체");
  const [statusFilter, setStatusFilter] = useState("전체");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [solutions, setSolutions] = useState<Record<string, SolutionLog[]>>({});

  async function reload() {
    const { data, error } = await supabase
      .from("wrong_problems")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) setError(error.message);
    else setProblems(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    reload();
  }, []);

  // 진행/목표 횟수 조정
  async function adjust(p: Problem, field: "done_count" | "target_count", delta: number) {
    let done = p.done_count;
    let target = p.target_count;
    if (field === "done_count") done = Math.max(0, Math.min(target, done + delta));
    else target = Math.max(1, Math.min(20, target + delta));
    if (field === "done_count" && done > target) done = target;

    const status = done >= target ? "완료" : "학습중";

    // 화면 먼저 갱신 (반응 빠르게)
    setProblems((prev) =>
      prev.map((x) =>
        x.id === p.id ? { ...x, done_count: done, target_count: target, status } : x,
      ),
    );
    const { error } = await supabase
      .from("wrong_problems")
      .update({ done_count: done, target_count: target, status })
      .eq("id", p.id);
    if (error) {
      setError(error.message);
      reload();
    }
  }

  async function toggleSolutions(p: Problem) {
    if (expanded === p.id) {
      setExpanded(null);
      return;
    }
    setExpanded(p.id);
    if (!solutions[p.id]) {
      const { data } = await supabase
        .from("solution_logs")
        .select("*")
        .eq("problem_id", p.id)
        .order("solved_at", { ascending: true });
      setSolutions((prev) => ({ ...prev, [p.id]: data ?? [] }));
    }
  }

  const students = ["전체", ...Array.from(new Set(problems.map((p) => p.student_name)))];
  const visible = problems.filter(
    (p) =>
      (student === "전체" || p.student_name === student) &&
      (statusFilter === "전체" || p.status === statusFilter),
  );

  const studying = problems.filter((p) => p.status === "학습중").length;
  const done = problems.filter((p) => p.status === "완료").length;
  const studentCount = new Set(problems.map((p) => p.student_name)).size;

  return (
    <main style={S.page}>
      <div style={S.wrap}>
        <Link href="/" style={S.back}>
          ← 홈
        </Link>
        <h1 style={S.title}>🧑‍🏫 원장·선생님 관리</h1>
        <p style={S.sub}>학생별 오답 현황과 풀이를 확인하고 횟수를 조정하세요.</p>

        {/* 요약 */}
        <div style={S.statRow}>
          <Stat label="학생 수" value={studentCount} color="#4338ca" />
          <Stat label="학습중" value={studying} color="#2563eb" />
          <Stat label="완료" value={done} color="#047857" />
        </div>

        {/* 필터 */}
        <div style={S.filterRow}>
          {["전체", "학습중", "완료"].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              style={{ ...S.filterChip, ...(statusFilter === s ? S.filterChipOn : {}) }}
            >
              {s}
            </button>
          ))}
        </div>
        {students.length > 1 && (
          <div style={S.filterRow}>
            {students.map((s) => (
              <button
                key={s}
                onClick={() => setStudent(s)}
                style={{ ...S.filterChip, ...(student === s ? S.filterChipOn : {}) }}
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {loading && <div style={S.info}>⏳ 불러오는 중...</div>}
        {error && <div style={{ ...S.info, color: "#b91c1c" }}>❌ {error}</div>}
        {!loading && !error && visible.length === 0 && (
          <div style={S.info}>표시할 항목이 없어요.</div>
        )}

        {visible.map((p) => {
          const pct = Math.min(100, Math.round((p.done_count / p.target_count) * 100));
          const isDone = p.status === "완료";
          const logs = solutions[p.id];
          return (
            <div key={p.id} style={S.card}>
              <div style={{ display: "flex", gap: 14 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.problem_image_url} alt="문제" style={S.thumb} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={S.name}>{p.student_name}</span>
                    <span style={{ ...S.badge, ...(isDone ? S.badgeDone : S.badgeStudy) }}>
                      {p.status}
                    </span>
                  </div>
                  <div style={S.meta}>
                    {[p.subject, p.unit].filter(Boolean).join(" · ") || "과목 미지정"}
                  </div>
                  <div style={S.progressRow}>
                    <div style={S.barBg}>
                      <div
                        style={{
                          ...S.barFill,
                          width: `${pct}%`,
                          background: isDone ? "#047857" : "#4338ca",
                        }}
                      />
                    </div>
                    <span style={{ ...S.countText, color: isDone ? "#047857" : "#4338ca" }}>
                      {p.done_count}/{p.target_count}회
                    </span>
                  </div>
                </div>
              </div>

              {/* 횟수 조정 */}
              <div style={S.adjustGrid}>
                <AdjustRow
                  label="완료 횟수"
                  value={p.done_count}
                  onMinus={() => adjust(p, "done_count", -1)}
                  onPlus={() => adjust(p, "done_count", +1)}
                />
                <AdjustRow
                  label="목표 횟수"
                  value={p.target_count}
                  onMinus={() => adjust(p, "target_count", -1)}
                  onPlus={() => adjust(p, "target_count", +1)}
                />
              </div>

              {/* 풀이 사진 보기 */}
              <button style={S.viewBtn} onClick={() => toggleSolutions(p)}>
                {expanded === p.id ? "풀이 사진 닫기 ▲" : "🖼️ 풀이 사진 보기 ▼"}
              </button>

              {expanded === p.id && (
                <div style={S.solWrap}>
                  {!logs && <span style={{ color: "#9ca3af", fontSize: 13 }}>불러오는 중...</span>}
                  {logs && logs.length === 0 && (
                    <span style={{ color: "#9ca3af", fontSize: 13 }}>
                      아직 올라온 풀이가 없어요.
                    </span>
                  )}
                  {logs?.map((l, i) => (
                    <a
                      key={l.id}
                      href={l.solution_image_url}
                      target="_blank"
                      rel="noreferrer"
                      style={S.solItem}
                      title={new Date(l.solved_at).toLocaleString("ko-KR")}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={l.solution_image_url} alt={`풀이 ${i + 1}`} style={S.solImg} />
                      <span style={S.solNo}>{i + 1}회</span>
                    </a>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </main>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={S.statBox}>
      <div style={{ fontSize: 26, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>{label}</div>
    </div>
  );
}

function AdjustRow({
  label,
  value,
  onMinus,
  onPlus,
}: {
  label: string;
  value: number;
  onMinus: () => void;
  onPlus: () => void;
}) {
  return (
    <div style={S.adjustRow}>
      <span style={S.adjustLabel}>{label}</span>
      <button style={S.adjustBtn} onClick={onMinus}>
        −
      </button>
      <span style={S.adjustVal}>{value}</span>
      <button style={S.adjustBtn} onClick={onPlus}>
        +
      </button>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  page: { minHeight: "100vh", display: "flex", justifyContent: "center", padding: "24px 16px" },
  wrap: { maxWidth: 560, width: "100%" },
  back: { color: "#6b7280", textDecoration: "none", fontSize: 14, fontWeight: 600 },
  title: { fontSize: 24, fontWeight: 800, margin: "10px 0 4px" },
  sub: { fontSize: 14, color: "#6b7280", marginBottom: 16 },
  statRow: { display: "flex", gap: 10, marginBottom: 16 },
  statBox: {
    flex: 1,
    background: "#fff",
    borderRadius: 14,
    padding: "16px 0",
    textAlign: "center",
    boxShadow: "0 6px 20px rgba(0,0,0,0.05)",
  },
  filterRow: { display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  filterChip: {
    padding: "7px 13px",
    borderRadius: 999,
    border: "1px solid #e5e7eb",
    background: "#fff",
    fontSize: 13,
    fontWeight: 700,
    color: "#6b7280",
    cursor: "pointer",
  },
  filterChipOn: { background: "#4338ca", color: "#fff", borderColor: "#4338ca" },
  info: {
    background: "#fff",
    borderRadius: 16,
    padding: 28,
    textAlign: "center",
    color: "#6b7280",
    fontSize: 15,
    boxShadow: "0 6px 20px rgba(0,0,0,0.05)",
  },
  card: {
    background: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    boxShadow: "0 6px 20px rgba(0,0,0,0.05)",
  },
  thumb: { width: 84, height: 84, objectFit: "cover", borderRadius: 12, background: "#f3f4f6", flexShrink: 0 },
  name: { fontSize: 17, fontWeight: 800 },
  badge: { fontSize: 12, fontWeight: 800, padding: "3px 9px", borderRadius: 999 },
  badgeStudy: { background: "#dbeafe", color: "#2563eb" },
  badgeDone: { background: "#d1fae5", color: "#047857" },
  meta: { fontSize: 13, color: "#9ca3af", marginTop: 2 },
  progressRow: { display: "flex", alignItems: "center", gap: 10, marginTop: 10 },
  barBg: { flex: 1, height: 10, background: "#eef2ff", borderRadius: 999, overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 999 },
  countText: { fontSize: 13, fontWeight: 800, whiteSpace: "nowrap" },
  adjustGrid: { display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" },
  adjustRow: {
    flex: 1,
    minWidth: 150,
    display: "flex",
    alignItems: "center",
    gap: 8,
    background: "#f9fafb",
    borderRadius: 12,
    padding: "8px 10px",
  },
  adjustLabel: { fontSize: 13, fontWeight: 700, color: "#374151", flex: 1 },
  adjustBtn: {
    width: 34,
    height: 34,
    borderRadius: 9,
    border: "1px solid #e5e7eb",
    background: "#fff",
    fontSize: 18,
    fontWeight: 700,
    cursor: "pointer",
  },
  adjustVal: { minWidth: 24, textAlign: "center", fontSize: 16, fontWeight: 800 },
  viewBtn: {
    width: "100%",
    marginTop: 14,
    padding: "11px",
    borderRadius: 11,
    border: "1px solid #e5e7eb",
    background: "#fff",
    fontSize: 14,
    fontWeight: 700,
    color: "#4338ca",
    cursor: "pointer",
  },
  solWrap: { display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 },
  solItem: { position: "relative", display: "block", textDecoration: "none" },
  solImg: { width: 92, height: 92, objectFit: "cover", borderRadius: 10, border: "1px solid #e5e7eb" },
  solNo: {
    position: "absolute",
    bottom: 4,
    left: 4,
    background: "rgba(0,0,0,0.6)",
    color: "#fff",
    fontSize: 11,
    fontWeight: 700,
    padding: "1px 6px",
    borderRadius: 6,
  },
};
