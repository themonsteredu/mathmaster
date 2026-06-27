"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { DBProblem, DBStudent } from "@/lib/data";
import { PageHeader, Avatar } from "@/components/ui";
import { IconPlus, IconSearch, IconChevronRight } from "@/components/icons";

export default function StudentsPage() {
  const router = useRouter();
  const [students, setStudents] = useState<DBStudent[]>([]);
  const [problems, setProblems] = useState<DBProblem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [grade, setGrade] = useState("");
  const [busy, setBusy] = useState(false);

  const [q, setQ] = useState("");
  const [gradeFilter, setGradeFilter] = useState("전체");

  async function load() {
    const [{ data: studs, error: e1 }, { data: probs }] = await Promise.all([
      supabase.from("students").select("*").order("name"),
      supabase.from("wrong_problems").select("*"),
    ]);
    if (e1) setError(e1.message);
    setStudents((studs as DBStudent[]) ?? []);
    setProblems((probs as DBProblem[]) ?? []);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  async function addStudent() {
    setError("");
    if (!name.trim()) return;
    setBusy(true);
    const { error } = await supabase.from("students").insert({ name: name.trim(), grade: grade.trim() || null });
    setBusy(false);
    if (error) return setError(error.message);
    setName("");
    setGrade("");
    setAdding(false);
    load();
  }

  async function removeStudent(s: DBStudent) {
    if (!confirm(`"${s.name}" 학생을 삭제할까요?\n이 학생의 오답 문항·완료 기록도 모두 함께 삭제됩니다. (되돌릴 수 없어요)`)) return;
    setError("");
    // 화면에서 즉시 제거 (체감 빠르게)
    setStudents((prev) => prev.filter((x) => x.id !== s.id));
    setProblems((prev) => prev.filter((p) => p.student_name !== s.name));
    try {
      // 1) 이 학생 문항들의 id를 모아 풀이 사진(solution_logs)부터 삭제 (연결 때문에 막히는 것 방지)
      const { data: probs } = await supabase.from("wrong_problems").select("id").eq("student_name", s.name);
      const ids = ((probs as { id: string }[]) ?? []).map((p) => p.id);
      if (ids.length) await supabase.from("solution_logs").delete().in("problem_id", ids);

      // 2) 오답 문항 삭제 (에러 확인!)
      const { error: e1 } = await supabase.from("wrong_problems").delete().eq("student_name", s.name);
      if (e1) throw new Error(e1.message);

      // 3) 완료 기록 + 학생 삭제
      await supabase.from("completions").delete().eq("student_name", s.name);
      const { error: e2 } = await supabase.from("students").delete().eq("id", s.id);
      if (e2) throw new Error(e2.message);
    } catch (e) {
      setError(`삭제 중 문제가 생겼어요: ${e instanceof Error ? e.message : "알 수 없는 오류"}`);
      load(); // 실패 시 원상복구
    }
  }

  const grades = ["전체", ...Array.from(new Set(students.map((s) => s.grade).filter(Boolean) as string[]))];
  const filtered = students.filter(
    (s) => (gradeFilter === "전체" || s.grade === gradeFilter) && (q === "" || s.name.includes(q)),
  );
  const statOf = (n: string) => {
    const ps = problems.filter((p) => p.student_name === n);
    return {
      total: ps.length,
      active: ps.filter((p) => p.status !== "경고" && p.status !== "완료").length,
      warn: ps.filter((p) => p.status === "경고").length,
    };
  };

  return (
    <>
      <PageHeader
        eyebrow="학생 관리"
        title="학생 명단"
        sub="학생을 등록해두면 오답 등록 때 이름을 골라 쓸 수 있어요."
        actions={
          <button className="btn btn-primary" onClick={() => setAdding((v) => !v)}>
            <IconPlus size={14} />학생 추가
          </button>
        }
      />

      {error && <div className="alert alert-err">{error}</div>}

      {adding && (
        <div className="card" style={{ padding: 18, marginBottom: 16 }}>
          <div className="row" style={{ gap: 8 }}>
            <input className="input" style={{ flex: 2 }} value={name} onChange={(e) => setName(e.target.value)} placeholder="이름 (예: 김민준)" onKeyDown={(e) => e.key === "Enter" && addStudent()} autoFocus />
            <input className="input" style={{ flex: 1 }} value={grade} onChange={(e) => setGrade(e.target.value)} placeholder="학년 (예: 중3)" onKeyDown={(e) => e.key === "Enter" && addStudent()} />
            <button className="btn btn-primary" onClick={addStudent} disabled={busy}>{busy ? "추가 중…" : "추가"}</button>
          </div>
        </div>
      )}

      {/* 검색 / 필터 */}
      <div className="row" style={{ gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
        <div className="row" style={{ flex: 1, minWidth: 200, background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 10, padding: "0 12px", gap: 6 }}>
          <IconSearch size={16} className="muted" />
          <input className="input" style={{ border: 0, padding: "10px 4px", fontSize: 15 }} placeholder="이름으로 검색" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
          {grades.map((g) => (
            <button key={g} className={`btn btn-sm ${gradeFilter === g ? "btn-primary" : "btn-secondary"}`} onClick={() => setGradeFilter(g)}>{g}</button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="alert alert-info">불러오는 중…</div>
      ) : students.length === 0 ? (
        <div className="empty card flat"><h4>아직 등록된 학생이 없어요</h4>위 「학생 추가」로 명단을 만들어 보세요.</div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <table className="table">
            <thead>
              <tr>
                <th>학생</th>
                <th style={{ width: 80 }}>학년</th>
                <th style={{ width: 90 }}>등록 오답</th>
                <th style={{ width: 80 }}>진행 중</th>
                <th style={{ width: 80 }}>경고</th>
                <th style={{ width: 70 }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => {
                const sm = statOf(s.name);
                return (
                  <tr key={s.id} className="row-link" onClick={() => router.push(`/admin/student/${encodeURIComponent(s.name)}`)}>
                    <td><span className="name"><Avatar name={s.name} />{s.name}</span></td>
                    <td className="muted">{s.grade || "—"}</td>
                    <td><span className="num">{sm.total}</span></td>
                    <td><span className="num">{sm.active}</span></td>
                    <td>{sm.warn > 0 ? <span className="chip chip-danger"><span className="dot" />{sm.warn}</span> : <span className="faint">—</span>}</td>
                    <td>
                      <button className="btn btn-ghost btn-sm" style={{ color: "var(--danger-ink)" }} onClick={(e) => { e.stopPropagation(); removeStudent(s); }}>삭제</button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={6}><div className="empty" style={{ padding: 28 }}><h4>해당하는 학생이 없습니다</h4></div></td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
