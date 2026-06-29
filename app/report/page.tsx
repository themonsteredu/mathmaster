"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { DBProblem } from "@/lib/data";
import { PageHeader } from "@/components/ui";
import { AcademyLogo } from "@/components/Logo";

type Completion = { student_name: string; unit: string | null; attempts: number; completed_at: string };

function startOf(period: "week" | "month" | "all") {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  if (period === "week") d.setDate(d.getDate() - 6);
  else if (period === "month") d.setDate(1);
  else return "1970-01-01";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function ReportPage() {
  const [students, setStudents] = useState<{ name: string; grade: string | null }[]>([]);
  const [completions, setCompletions] = useState<Completion[]>([]);
  const [problems, setProblems] = useState<DBProblem[]>([]);
  const [who, setWho] = useState("");
  const [period, setPeriod] = useState<"week" | "month" | "all">("month");
  const [comment, setComment] = useState("");

  useEffect(() => {
    (async () => {
      const [{ data: st }, { data: cp }, { data: pr }] = await Promise.all([
        supabase.from("students").select("name, grade").order("name"),
        supabase.from("completions").select("*"),
        supabase.from("wrong_problems").select("*"),
      ]);
      setStudents((st as { name: string; grade: string | null }[]) ?? []);
      setCompletions((cp as Completion[]) ?? []);
      setProblems((pr as DBProblem[]) ?? []);
      if (st && st.length && !who) setWho((st[0] as { name: string }).name);
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const since = startOf(period);
  const grade = students.find((s) => s.name === who)?.grade || "";

  const doneList = useMemo(
    () => completions.filter((c) => c.student_name === who && c.completed_at.slice(0, 10) >= since),
    [completions, who, since],
  );
  const active = problems.filter((p) => p.student_name === who && p.status !== "완료" && p.status !== "경고");

  const doneCount = doneList.length;
  const avgTry = doneCount > 0 ? (doneList.reduce((a, c) => a + (c.attempts + 1), 0) / doneCount).toFixed(1) : "-";

  // 단원별 완료 집계
  const byUnit = new Map<string, number>();
  doneList.forEach((c) => {
    const u = c.unit?.trim() || "기타";
    byUnit.set(u, (byUnit.get(u) ?? 0) + 1);
  });
  const units = Array.from(byUnit.entries()).sort((a, b) => b[1] - a[1]);

  // 유형별 약점 집계 (이 학생의 오답을 type_code별로 — 많이 틀린 순)
  const weakTypes = useMemo(() => {
    const map = new Map<string, { code: string; name: string; count: number }>();
    problems
      .filter((p) => p.student_name === who && p.created_at.slice(0, 10) >= since && p.type_code)
      .forEach((p) => {
        const key = p.type_code as string;
        const cur = map.get(key) ?? { code: key, name: p.type_name || key, count: 0 };
        cur.count++;
        map.set(key, cur);
      });
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [problems, who, since]);

  const periodLabel = period === "week" ? "최근 7일" : period === "month" ? "이번 달" : "전체 기간";
  const today = new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });

  return (
    <>
      <div className="no-print">
        <PageHeader
          eyebrow="리포트"
          title="오답 학습 리포트"
          sub="학부모님께 드릴 1장짜리 요약 리포트예요. 인쇄하거나 PDF로 저장하세요."
          actions={<button className="btn btn-primary" onClick={() => window.print()} disabled={!who}>🖨️ 인쇄 / PDF 저장</button>}
        />
        <div className="card" style={{ padding: 18, marginBottom: 16 }}>
          <div className="row" style={{ gap: 14, flexWrap: "wrap", alignItems: "flex-end" }}>
            <div>
              <label className="label">학생</label>
              <select className="select" value={who} onChange={(e) => setWho(e.target.value)}>
                {students.map((s) => <option key={s.name} value={s.name}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">기간</label>
              <div className="row" style={{ gap: 6 }}>
                {([["week", "최근 7일"], ["month", "이번 달"], ["all", "전체"]] as const).map(([v, l]) => (
                  <button key={v} className={`btn btn-sm ${period === v ? "btn-primary" : "btn-secondary"}`} onClick={() => setPeriod(v)}>{l}</button>
                ))}
              </div>
            </div>
          </div>
          <div className="field" style={{ marginTop: 14, marginBottom: 0 }}>
            <label className="label">선생님 한마디 (레포트에 들어가요)</label>
            <input className="input" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="예: 이차방정식 실수가 많이 줄었어요. 꾸준함이 정말 좋습니다!" />
          </div>
        </div>
      </div>

      {/* 인쇄용 리포트 (A4 1장) */}
      <div className="ws-page">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", borderBottom: "3px solid var(--ink)", paddingBottom: 12, marginBottom: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <AcademyLogo size={44} />
            <div>
              <div style={{ fontSize: 12, letterSpacing: "0.15em", color: "#888", fontWeight: 700 }}>MATHMASTER</div>
              <div style={{ fontFamily: "var(--font-serif)", fontSize: 26, fontWeight: 700, marginTop: 4 }}>오답 학습 리포트</div>
            </div>
          </div>
          <div style={{ textAlign: "right", fontSize: 13, color: "#444" }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: "var(--ink)" }}>{who} {grade && <span style={{ fontSize: 13, color: "#888", fontWeight: 500 }}>{grade}</span>}</div>
            <div>{periodLabel} · {today} 발행</div>
          </div>
        </div>

        {/* 큰 숫자 3개 */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 22 }}>
          {[
            { label: "완료한 오답", value: doneCount, unit: "개", color: "var(--done-ink)" },
            { label: "학습 중 오답", value: active.length, unit: "개", color: "var(--accent-ink)" },
            { label: "평균 시도", value: avgTry, unit: "회 만에 해결", color: "var(--ink)" },
          ].map((s) => (
            <div key={s.label} style={{ border: "1px solid var(--line)", borderRadius: 14, padding: "18px 16px", textAlign: "center" }}>
              <div style={{ fontFamily: "var(--font-serif)", fontSize: 36, fontWeight: 700, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 12, color: "#666", marginTop: 4, fontWeight: 600 }}>{s.label}</div>
              <div style={{ fontSize: 11, color: "#aaa" }}>{s.unit}</div>
            </div>
          ))}
        </div>

        {/* 단원별 성취 */}
        <div style={{ marginBottom: 22 }}>
          <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 10 }}>📚 {periodLabel}에 마스터한 단원</div>
          {units.length === 0 ? (
            <div style={{ color: "#999", fontSize: 13 }}>아직 완료한 오답이 없어요. 지금부터 차근차근 쌓아가요!</div>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {units.map(([u, n]) => (
                <span key={u} style={{ border: "1px solid var(--line)", borderRadius: 999, padding: "6px 14px", fontSize: 14, fontWeight: 700 }}>
                  {u} <span style={{ color: "var(--done-ink)" }}>×{n}</span>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* 유형별 약점 */}
        <div style={{ marginBottom: 22 }}>
          <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 10 }}>🎯 자주 틀리는 유형 (집중 보완)</div>
          {weakTypes.length === 0 ? (
            <div style={{ color: "#999", fontSize: 13 }}>아직 유형이 기록된 오답이 없어요. (오답 등록 때 유형을 지정하면 여기에 쌓여요)</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              {weakTypes.slice(0, 6).map((t, i) => {
                const max = weakTypes[0].count || 1;
                return (
                  <div key={t.code} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 13, fontWeight: 800, width: 16, color: "#bbb", textAlign: "right" }}>{i + 1}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                        <span style={{ fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.name}</span>
                        <span style={{ color: "var(--accent-ink)", fontWeight: 800, flexShrink: 0, marginLeft: 8 }}>{t.count}회</span>
                      </div>
                      <div style={{ height: 8, background: "var(--bg-soft)", borderRadius: 999, marginTop: 3, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${Math.round((t.count / max) * 100)}%`, background: "var(--accent)", borderRadius: 999 }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 선생님 한마디 */}
        <div style={{ background: "var(--bg-soft)", borderRadius: 14, padding: "16px 18px", marginBottom: 18 }}>
          <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 6 }}>✍️ 선생님 한마디</div>
          <div style={{ fontSize: 14, color: "#333", lineHeight: 1.6, minHeight: 24 }}>{comment || "—"}</div>
        </div>

        <div style={{ textAlign: "center", fontSize: 13, color: "#888" }}>
          틀린 문제를 반복해서 풀며 실력이 단단해지고 있어요. 가정에서도 따뜻한 격려 부탁드립니다. 🙌
        </div>
      </div>
    </>
  );
}
