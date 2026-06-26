"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
      // 1) 풀이 사진을 보관함에 올린다
      const ext = file.name.split(".").pop() || "jpg";
      const path = `solutions/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from(PHOTO_BUCKET).upload(path, file);
      if (upErr) throw upErr;

      const { data: pub } = supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path);

      // 2) 풀이기록 표에 한 줄 추가
      const { error: logErr } = await supabase.from("solution_logs").insert({
        problem_id: p.id,
        solution_image_url: pub.publicUrl,
      });
      if (logErr) throw logErr;

      // 3) 완료 횟수 +1, 목표 도달 시 '완료'로 변경
      const newDone = p.done_count + 1;
      const completed = newDone >= p.target_count;
      const { error: updErr } = await supabase
        .from("wrong_problems")
        .update({ done_count: newDone, status: completed ? "완료" : "학습중" })
        .eq("id", p.id);
      if (updErr) throw updErr;

      // 화면 갱신
      setProblems((prev) =>
        prev.map((x) =>
          x.id === p.id
            ? { ...x, done_count: newDone, status: completed ? "완료" : "학습중" }
            : x,
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

  // 아직 학습중인 문제만 보여준다 (완료된 것은 자동으로 내려감)
  const active = problems.filter((p) => p.status === "학습중");
  const students = ["전체", ...Array.from(new Set(active.map((p) => p.student_name)))];
  const visible = student === "전체" ? active : active.filter((p) => p.student_name === student);

  return (
    <main style={S.page}>
      <div style={S.wrap}>
        <Link href="/" style={S.back}>
          ← 홈
        </Link>
        <h1 style={S.title}>📋 학생 오답함</h1>
        <p style={S.sub}>아직 다 풀지 않은 오답 문제들이에요.</p>

        {banner && (
          <div
            style={{
              ...S.banner,
              background: banner.type === "ok" ? "#ecfdf5" : "#fef2f2",
              color: banner.type === "ok" ? "#047857" : "#b91c1c",
            }}
          >
            {banner.text}
          </div>
        )}

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
          <div style={S.info}>
            🎉 표시할 오답이 없어요.
            <br />
            <Link href="/upload" style={{ color: "#4338ca", fontWeight: 700 }}>
              오답 올리러 가기
            </Link>
          </div>
        )}

        {visible.map((p) => {
          const pct = Math.min(100, Math.round((p.done_count / p.target_count) * 100));
          const isBusy = busyId === p.id;
          return (
            <div key={p.id} style={S.card}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.problem_image_url} alt="문제" style={S.thumb} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={S.name}>{p.student_name}</div>
                <div style={S.meta}>
                  {[p.subject, p.unit].filter(Boolean).join(" · ") || "과목 미지정"}
                </div>

                <div style={S.progressRow}>
                  <div style={S.barBg}>
                    <div style={{ ...S.barFill, width: `${pct}%` }} />
                  </div>
                  <span style={S.countText}>
                    {p.done_count}/{p.target_count}회
                  </span>
                </div>

                <label style={{ ...S.solveBtn, ...(isBusy ? S.solveBtnBusy : {}) }}>
                  {isBusy ? "올리는 중..." : "✏️ 풀이 올리기"}
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
      </div>
    </main>
  );
}

const S: Record<string, React.CSSProperties> = {
  page: { minHeight: "100vh", display: "flex", justifyContent: "center", padding: "24px 16px" },
  wrap: { maxWidth: 520, width: "100%" },
  back: { color: "#6b7280", textDecoration: "none", fontSize: 14, fontWeight: 600 },
  title: { fontSize: 24, fontWeight: 800, margin: "10px 0 4px" },
  sub: { fontSize: 14, color: "#6b7280", marginBottom: 16 },
  banner: { padding: "14px 16px", borderRadius: 12, fontSize: 14, fontWeight: 700, marginBottom: 16, lineHeight: 1.5 },
  filterRow: { display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  filterChip: {
    padding: "8px 14px",
    borderRadius: 999,
    border: "1px solid #e5e7eb",
    background: "#fff",
    fontSize: 14,
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
    lineHeight: 1.7,
    boxShadow: "0 6px 20px rgba(0,0,0,0.05)",
  },
  card: {
    display: "flex",
    gap: 14,
    background: "#fff",
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    boxShadow: "0 6px 20px rgba(0,0,0,0.05)",
  },
  thumb: { width: 84, height: 84, objectFit: "cover", borderRadius: 12, background: "#f3f4f6", flexShrink: 0 },
  name: { fontSize: 17, fontWeight: 800 },
  meta: { fontSize: 13, color: "#9ca3af", marginTop: 2 },
  progressRow: { display: "flex", alignItems: "center", gap: 10, marginTop: 10 },
  barBg: { flex: 1, height: 10, background: "#eef2ff", borderRadius: 999, overflow: "hidden" },
  barFill: { height: "100%", background: "#4338ca", borderRadius: 999 },
  countText: { fontSize: 13, fontWeight: 800, color: "#4338ca", whiteSpace: "nowrap" },
  solveBtn: {
    display: "inline-block",
    marginTop: 12,
    padding: "10px 16px",
    borderRadius: 10,
    border: "none",
    background: "#4338ca",
    color: "#fff",
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
  },
  solveBtnBusy: { background: "#9ca3af", cursor: "wait" },
};
