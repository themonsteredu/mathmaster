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

export default function BoxPage() {
  const [loading, setLoading] = useState(true);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [student, setStudent] = useState("전체");
  const [error, setError] = useState("");

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

  // 학생 이름 목록 (중복 제거)
  const students = ["전체", ...Array.from(new Set(problems.map((p) => p.student_name)))];
  const visible =
    student === "전체" ? problems : problems.filter((p) => p.student_name === student);

  return (
    <main style={S.page}>
      <div style={S.wrap}>
        <Link href="/" style={S.back}>
          ← 홈
        </Link>
        <h1 style={S.title}>📋 학생 오답함</h1>
        <p style={S.sub}>아직 다 풀지 않은 오답 문제들이에요.</p>

        {/* 학생 선택 */}
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
          return (
            <div key={p.id} style={S.card}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.problem_image_url} alt="문제" style={S.thumb} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={S.name}>{p.student_name}</div>
                <div style={S.meta}>
                  {[p.subject, p.unit].filter(Boolean).join(" · ") || "과목 미지정"}
                </div>

                {/* 진행 표시 */}
                <div style={S.progressRow}>
                  <div style={S.barBg}>
                    <div style={{ ...S.barFill, width: `${pct}%` }} />
                  </div>
                  <span style={S.countText}>
                    {p.done_count}/{p.target_count}회
                  </span>
                </div>

                <button style={S.solveBtn} disabled title="4단계에서 켜집니다">
                  ✏️ 풀이 올리기 (준비 중)
                </button>
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
  thumb: {
    width: 84,
    height: 84,
    objectFit: "cover",
    borderRadius: 12,
    background: "#f3f4f6",
    flexShrink: 0,
  },
  name: { fontSize: 17, fontWeight: 800 },
  meta: { fontSize: 13, color: "#9ca3af", marginTop: 2 },
  progressRow: { display: "flex", alignItems: "center", gap: 10, marginTop: 10 },
  barBg: { flex: 1, height: 10, background: "#eef2ff", borderRadius: 999, overflow: "hidden" },
  barFill: { height: "100%", background: "#4338ca", borderRadius: 999 },
  countText: { fontSize: 13, fontWeight: 800, color: "#4338ca", whiteSpace: "nowrap" },
  solveBtn: {
    marginTop: 12,
    padding: "10px 14px",
    borderRadius: 10,
    border: "1px solid #e5e7eb",
    background: "#f9fafb",
    color: "#9ca3af",
    fontSize: 14,
    fontWeight: 700,
    cursor: "not-allowed",
  },
};
