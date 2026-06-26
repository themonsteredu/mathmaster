"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppBar from "@/components/AppBar";
import { supabase, PHOTO_BUCKET } from "@/lib/supabase";

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

export default function BoxPage() {
  const [loading, setLoading] = useState(true);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [student, setStudent] = useState("전체");
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    supabase
      .from("wrong_problems")
      .select("*")
      .eq("status", "학습중")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else setProblems(data ?? []);
        setLoading(false);
      });
  }, []);

  async function handleSolution(p: Problem, file: File | undefined | null) {
    if (!file) return;
    setBusyId(p.id);
    setBanner(null);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `solutions/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from(PHOTO_BUCKET).upload(path, file);
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path);

      const { error: logErr } = await supabase.from("solution_logs").insert({
        problem_id: p.id,
        solution_image_url: pub.publicUrl,
      });
      if (logErr) throw logErr;

      const newDone = p.done_count + 1;
      const completed = newDone >= p.target_count;
      const { error: updErr } = await supabase
        .from("wrong_problems")
        .update({ done_count: newDone, status: completed ? "완료" : "학습중" })
        .eq("id", p.id);
      if (updErr) throw updErr;

      setProblems((prev) =>
        prev.map((x) =>
          x.id === p.id ? { ...x, done_count: newDone, status: completed ? "완료" : "학습중" } : x,
        ),
      );
      setBanner({
        type: "ok",
        text: completed
          ? `🎉 ${p.student_name} 학생, ${p.target_count}회 모두 완료! 오답함에서 내려갑니다.`
          : `✅ 풀이 1회 인정! 이제 ${newDone}/${p.target_count}회예요.`,
      });
    } catch (e) {
      const text = e instanceof Error ? e.message : "알 수 없는 오류가 났어요.";
      setBanner({ type: "err", text: `풀이 등록 실패: ${text}` });
    } finally {
      setBusyId(null);
    }
  }

  const active = problems.filter((p) => p.status === "학습중");
  const students = ["전체", ...Array.from(new Set(active.map((p) => p.student_name)))];
  const visible = student === "전체" ? active : active.filter((p) => p.student_name === student);

  return (
    <>
      <AppBar />
      <main className="container">
        <h1 className="page-title">학생 오답함</h1>
        <p className="page-sub">아직 다 풀지 않은 오답 문제들이에요.</p>

        {banner && (
          <div className={banner.type === "ok" ? "alert alert-ok" : "alert alert-err"}>{banner.text}</div>
        )}

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
          <div className="card" style={{ textAlign: "center", color: "var(--muted)" }}>
            🎉 표시할 오답이 없어요.
            <br />
            <Link href="/upload" style={{ color: "var(--study-fg)", fontWeight: 700 }}>
              오답 등록하러 가기
            </Link>
          </div>
        )}

        {visible.map((p) => {
          const pct = Math.min(100, Math.round((p.done_count / p.target_count) * 100));
          const isBusy = busyId === p.id;
          return (
            <div key={p.id} className="card" style={{ display: "flex", gap: 14 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.problem_image_url} alt="문제" style={thumb} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 16, fontWeight: 800 }}>{p.student_name}</div>
                <div style={{ fontSize: 13, color: "var(--faint)", marginTop: 2 }}>
                  {[p.subject, p.unit].filter(Boolean).join(" · ") || "과목 미지정"}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10 }}>
                  <div className="progress">
                    <div className="progress-bar" style={{ width: `${pct}%` }} />
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 800, color: "var(--accent)", whiteSpace: "nowrap" }}>
                    {p.done_count}/{p.target_count}회
                  </span>
                </div>
                <label
                  className="btn btn-primary"
                  style={{ marginTop: 12, padding: "10px 16px", fontSize: 14, ...(isBusy ? { opacity: 0.6 } : {}) }}
                >
                  {isBusy ? "올리는 중…" : "✏️ 풀이 올리기"}
                  <input
                    type="file"
                    accept="image/*"
                    disabled={busyId !== null}
                    style={{ display: "none" }}
                    onChange={(e) => {
                      handleSolution(p, e.target.files?.[0]);
                      e.target.value = "";
                    }}
                  />
                </label>
              </div>
            </div>
          );
        })}
      </main>
    </>
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
