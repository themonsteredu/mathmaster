"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { DBProblem, statusKey, problemTitle, problemTopic, summarize } from "@/lib/data";
import { PageHeader, StatCard, SectionH, StatusChip, ProgressDots } from "@/components/ui";
import { IconChevronLeft } from "@/components/icons";

type SolutionLog = { id: string; problem_id: string; solution_image_url: string; solved_at: string };

export default function StudentDetail() {
  const params = useParams<{ name: string }>();
  const router = useRouter();
  const name = decodeURIComponent(params.name);

  const [loading, setLoading] = useState(true);
  const [problems, setProblems] = useState<DBProblem[]>([]);
  const [grade, setGrade] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [solutions, setSolutions] = useState<Record<string, SolutionLog[]>>({});

  useEffect(() => {
    (async () => {
      const [{ data: probs }, { data: studs }] = await Promise.all([
        supabase.from("wrong_problems").select("*").eq("student_name", name).order("created_at", { ascending: false }),
        supabase.from("students").select("grade").eq("name", name).limit(1),
      ]);
      setProblems((probs as DBProblem[]) ?? []);
      setGrade(studs?.[0]?.grade ?? "");
      setLoading(false);
    })();
  }, [name]);

  async function adjust(p: DBProblem, field: "done_count" | "target_count", delta: number) {
    let done = p.done_count;
    let target = p.target_count;
    if (field === "done_count") done = Math.max(0, Math.min(target, done + delta));
    else target = Math.max(1, Math.min(20, target + delta));
    if (done > target) done = target;
    const status = done >= target ? "완료" : "학습중";
    setProblems((prev) => prev.map((x) => (x.id === p.id ? { ...x, done_count: done, target_count: target, status } : x)));
    await supabase.from("wrong_problems").update({ done_count: done, target_count: target, status }).eq("id", p.id);
  }

  async function toggleSolutions(p: DBProblem) {
    if (expanded === p.id) return setExpanded(null);
    setExpanded(p.id);
    if (!solutions[p.id]) {
      const { data } = await supabase.from("solution_logs").select("*").eq("problem_id", p.id).order("solved_at", { ascending: true });
      setSolutions((prev) => ({ ...prev, [p.id]: (data as SolutionLog[]) ?? [] }));
    }
  }

  const sm = summarize(problems);

  return (
    <>
      <button className="btn btn-ghost btn-sm" style={{ marginBottom: 12, paddingLeft: 0 }} onClick={() => router.push("/admin")}>
        <IconChevronLeft size={14} />대시보드
      </button>

      <PageHeader
        eyebrow={`${grade || "학생"} · 등록 ${problems.length}문제`}
        title={name}
        sub={`전체 진행률 ${sm.progress}% · 누적 풀이 ${sm.totalDone}회`}
      />

      <div className="grid grid-3">
        <StatCard label="학습중" value={sm.study + sm.fresh} unit="문제" />
        <StatCard label="완료" value={sm.done} unit="문제" />
        <StatCard label="누적 풀이" value={sm.totalDone} unit="회" />
      </div>

      <SectionH title="오답 목록" right={`${problems.length}건`} />

      {loading ? (
        <div className="alert alert-info">불러오는 중…</div>
      ) : problems.length === 0 ? (
        <div className="empty card flat"><h4>등록된 오답이 없습니다</h4></div>
      ) : (
        <div className="stack" style={{ gap: 10 }}>
          {problems.map((p) => {
            const done = statusKey(p) === "done";
            const logs = solutions[p.id];
            return (
              <div key={p.id} className="card" style={{ padding: 16 }}>
                <div className="row" style={{ gap: 14, alignItems: "flex-start" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.problem_image_url} alt="문제" style={{ width: 76, height: 76, objectFit: "cover", borderRadius: 12, flexShrink: 0, background: "var(--bg-soft)" }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="row" style={{ gap: 8, marginBottom: 5 }}>
                      <StatusChip status={statusKey(p)} />
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{problemTitle(p)}</div>
                    <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>{problemTopic(p)}</div>
                    <div className="row" style={{ gap: 10, marginTop: 10 }}>
                      <ProgressDots total={p.target_count} done={p.done_count} current={!done} />
                      <span className="num" style={{ fontSize: 13 }}>{p.done_count}/{p.target_count}</span>
                    </div>
                  </div>
                </div>

                <div className="row" style={{ gap: 10, marginTop: 14, flexWrap: "wrap" }}>
                  <Adjust label="완료 횟수" value={p.done_count} onMinus={() => adjust(p, "done_count", -1)} onPlus={() => adjust(p, "done_count", 1)} />
                  <Adjust label="목표 횟수" value={p.target_count} onMinus={() => adjust(p, "target_count", -1)} onPlus={() => adjust(p, "target_count", 1)} />
                </div>

                <button className="btn btn-secondary btn-block btn-sm" style={{ marginTop: 12 }} onClick={() => toggleSolutions(p)}>
                  {expanded === p.id ? "풀이 사진 닫기 ▲" : "🖼️ 풀이 사진 보기 ▼"}
                </button>

                {expanded === p.id && (
                  <div className="row" style={{ gap: 10, flexWrap: "wrap", marginTop: 12 }}>
                    {!logs && <span className="faint" style={{ fontSize: 13 }}>불러오는 중…</span>}
                    {logs && logs.length === 0 && <span className="faint" style={{ fontSize: 13 }}>아직 올라온 풀이가 없어요.</span>}
                    {logs?.map((l, i) => (
                      <a key={l.id} href={l.solution_image_url} target="_blank" rel="noreferrer" style={{ position: "relative", display: "block" }} title={new Date(l.solved_at).toLocaleString("ko-KR")}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={l.solution_image_url} alt={`풀이 ${i + 1}`} style={{ width: 90, height: 90, objectFit: "cover", borderRadius: 10, border: "1px solid var(--line)" }} />
                        <span style={{ position: "absolute", bottom: 4, left: 4, background: "rgba(28,26,23,0.75)", color: "#fff", fontSize: 11, fontWeight: 700, padding: "1px 6px", borderRadius: 6 }}>{i + 1}회</span>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

function Adjust({ label, value, onMinus, onPlus }: { label: string; value: number; onMinus: () => void; onPlus: () => void }) {
  return (
    <div className="row" style={{ flex: 1, minWidth: 160, gap: 8, background: "var(--bg-soft)", border: "1px solid var(--line)", borderRadius: 12, padding: "8px 10px" }}>
      <span style={{ fontSize: 13, fontWeight: 700, color: "var(--ink-soft)", flex: 1 }}>{label}</span>
      <button className="step-btn" onClick={onMinus}>−</button>
      <span className="step-val">{value}</span>
      <button className="step-btn" onClick={onPlus}>+</button>
    </div>
  );
}
