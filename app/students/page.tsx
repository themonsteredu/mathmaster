"use client";

import { useEffect, useState } from "react";
import AppBar from "@/components/AppBar";
import { supabase } from "@/lib/supabase";

type Student = { id: string; name: string; grade: string | null; created_at: string };

export default function StudentsPage() {
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<Student[]>([]);
  const [name, setName] = useState("");
  const [grade, setGrade] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    const { data, error } = await supabase.from("students").select("*").order("name");
    if (error) setError(error.message);
    else setStudents(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function addStudent() {
    setError("");
    if (!name.trim()) return;
    setBusy(true);
    const { error } = await supabase.from("students").insert({
      name: name.trim(),
      grade: grade.trim() || null,
    });
    setBusy(false);
    if (error) return setError(error.message);
    setName("");
    setGrade("");
    load();
  }

  async function removeStudent(s: Student) {
    if (!confirm(`"${s.name}" 학생을 명단에서 지울까요?\n(이미 등록된 오답 기록은 그대로 남아요)`)) return;
    const { error } = await supabase.from("students").delete().eq("id", s.id);
    if (error) return setError(error.message);
    load();
  }

  return (
    <>
      <AppBar />
      <main className="container">
        <h1 className="page-title">학생 관리</h1>
        <p className="page-sub">학생을 등록해두면, 오답 등록 때 이름을 골라 쓸 수 있어요.</p>

        {error && <div className="alert alert-err">{error}</div>}

        {/* 학생 추가 */}
        <div className="card">
          <span className="label">새 학생 추가</span>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              className="input"
              style={{ flex: 2 }}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="이름 (예: 김민준)"
              onKeyDown={(e) => e.key === "Enter" && addStudent()}
            />
            <input
              className="input"
              style={{ flex: 1 }}
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              placeholder="학년/반"
              onKeyDown={(e) => e.key === "Enter" && addStudent()}
            />
          </div>
          <button className="btn btn-primary btn-block" style={{ marginTop: 12 }} onClick={addStudent} disabled={busy}>
            {busy ? "추가 중…" : "+ 학생 추가"}
          </button>
        </div>

        {/* 명단 */}
        <div style={{ marginTop: 18 }}>
          <span className="label">등록된 학생 ({students.length}명)</span>
          {loading && <div className="alert alert-info">불러오는 중…</div>}
          {!loading && students.length === 0 && (
            <div className="card" style={{ textAlign: "center", color: "var(--muted)" }}>
              아직 등록된 학생이 없어요. 위에서 추가해 보세요.
            </div>
          )}
          {students.map((s) => (
            <div
              key={s.id}
              className="card"
              style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px" }}
            >
              <span style={{ fontSize: 16, fontWeight: 800 }}>{s.name}</span>
              {s.grade && <span style={{ fontSize: 13, color: "var(--muted)" }}>{s.grade}</span>}
              <button
                onClick={() => removeStudent(s)}
                style={{
                  marginLeft: "auto",
                  background: "none",
                  border: "none",
                  color: "var(--danger)",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                삭제
              </button>
            </div>
          ))}
        </div>
      </main>
    </>
  );
}
