"use client";

import { useEffect, useState } from "react";
import AppBar from "@/components/AppBar";
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

  async function adjust(p: Problem, field: "done_count" | "target_count", delta: number) {
    let done = p.done_count;
    let target = p.target_count;
    if (field === "done_count") done = Math.max(0, Math.min(target, done + delta));
    else target = Math.max(1, Math.min(20, target + delta));
    if (done > target) done = target;
    const status = done >= target ? "완료" : "학습중";

    setProblems((prev) =>
      prev.map((x) => (x.id === p.id ? { ...x, done_count: done, target_count: target, status } : x)),
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
    if (expanded === p.id) return setExpanded(null);
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
    <>
      <AppBar />
      <main className="container">
        <h1 className="page-title">원장·선생님 관리</h1>
        <p className="page-sub">학생별 현황과 풀이를 확인하고 횟수를 조정하세요.</p>

        <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
          <Stat label="학생" value={studentCount} />
          <Stat label="학습중" value={studying} color="var(--study-fg)" />
          <Stat label="완료" value={done} color="var(--done-fg)" />
        </div>

        <div className="chip-row">
          {["전체", "학습중", "완료"].map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)} className={statusFilter === s ? "chip chip-on" : "chip"}>
              {s}
            </button>
          ))}
        </div>
        {students.length > 1 && (
          <div className="chip-row">
            {students.map((s) => (
              <button key={s} onClick={() => setStudent(s)} className={student === s ? "chip chip-on" : "chip"}>
                {s}
              </button>
            ))}
          </div>
        )}

        {loading && <div className="alert alert-info">불러오는 중…</div>}
        {error && <div className="alert alert-err">{error}</div>}
        {!loading && !error && visible.length === 0 && (
          <div className="card" style={{ textAlign: "center", color: "var(--muted)" }}>표시할 항목이 없어요.</div>
        )}

        {visible.map((p) => {
          const pct = Math.min(100, Math.round((p.done_count / p.target_count) * 100));
          const isDone = p.status === "완료";
          const logs = solutions[p.id];
          return (
            <div key={p.id} className="card">
              <div style={{ display: "flex", gap: 14 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.problem_image_url} alt="문제" style={thumb} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 16, fontWeight: 800 }}>{p.student_name}</span>
                    <span className={isDone ? "badge badge-done" : "badge badge-study"}>{p.status}</span>
                  </div>
                  <div style={{ fontSize: 13, color: "var(--faint)", marginTop: 2 }}>
                    {[p.subject, p.unit].filter(Boolean).join(" · ") || "과목 미지정"}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10 }}>
                    <div className="progress">
                      <div
                        className="progress-bar"
                        style={{ width: `${pct}%`, background: isDone ? "var(--done-fg)" : "var(--accent)" }}
                      />
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 800, color: isDone ? "var(--done-fg)" : "var(--accent)", whiteSpace: "nowrap" }}>
                      {p.done_count}/{p.target_count}회
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
                <AdjustRow label="완료 횟수" value={p.done_count} onMinus={() => adjust(p, "done_count", -1)} onPlus={() => adjust(p, "done_count", 1)} />
                <AdjustRow label="목표 횟수" value={p.target_count} onMinus={() => adjust(p, "target_count", -1)} onPlus={() => adjust(p, "target_count", 1)} />
              </div>

              <button className="btn btn-ghost btn-block" style={{ marginTop: 12, fontSize: 14 }} onClick={() => toggleSolutions(p)}>
                {expanded === p.id ? "풀이 사진 닫기 ▲" : "🖼️ 풀이 사진 보기 ▼"}
              </button>

              {expanded === p.id && (
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
                  {!logs && <span style={{ color: "var(--faint)", fontSize: 13 }}>불러오는 중…</span>}
                  {logs && logs.length === 0 && (
                    <span style={{ color: "var(--faint)", fontSize: 13 }}>아직 올라온 풀이가 없어요.</span>
                  )}
                  {logs?.map((l, i) => (
                    <a
                      key={l.id}
                      href={l.solution_image_url}
                      target="_blank"
                      rel="noreferrer"
                      style={{ position: "relative", display: "block" }}
                      title={new Date(l.solved_at).toLocaleString("ko-KR")}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={l.solution_image_url} alt={`풀이 ${i + 1}`} style={solImg} />
                      <span style={solNo}>{i + 1}회</span>
                    </a>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </main>
    </>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="card" style={{ flex: 1, textAlign: "center", padding: "16px 0" }}>
      <div style={{ fontSize: 26, fontWeight: 800, color: color ?? "var(--ink)" }}>{value}</div>
      <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{label}</div>
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
    <div
      style={{
        flex: 1,
        minWidth: 150,
        display: "flex",
        alignItems: "center",
        gap: 8,
        background: "#f8fafc",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: "8px 10px",
      }}
    >
      <span style={{ fontSize: 13, fontWeight: 700, color: "#334155", flex: 1 }}>{label}</span>
      <button className="step-btn" onClick={onMinus}>−</button>
      <span className="step-val">{value}</span>
      <button className="step-btn" onClick={onPlus}>+</button>
    </div>
  );
}

const thumb: React.CSSProperties = {
  width: 84,
  height: 84,
  objectFit: "cover",
  borderRadius: 12,
  background: "#f1f5f9",
  flexShrink: 0,
};
const solImg: React.CSSProperties = {
  width: 92,
  height: 92,
  objectFit: "cover",
  borderRadius: 10,
  border: "1px solid var(--border)",
};
const solNo: React.CSSProperties = {
  position: "absolute",
  bottom: 4,
  left: 4,
  background: "rgba(15,23,42,0.7)",
  color: "#fff",
  fontSize: 11,
  fontWeight: 700,
  padding: "1px 6px",
  borderRadius: 6,
};
