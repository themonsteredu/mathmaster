"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { DBProblem, problemImage, nextDue, todayISO } from "@/lib/data";

function md(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}
import { PageHeader, StatCard, SectionH } from "@/components/ui";
import { IconChevronLeft } from "@/components/icons";

export default function StudentDetail() {
  const params = useParams<{ name: string }>();
  const router = useRouter();
  const name = decodeURIComponent(params.name);

  const [loading, setLoading] = useState(true);
  const [problems, setProblems] = useState<DBProblem[]>([]);
  const [grade, setGrade] = useState("");

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

  async function complete(p: DBProblem) {
    if (!confirm(`이 문항을 완료 처리하고 삭제할까요?\n(다시 출제되지 않아요)`)) return;
    setProblems((prev) => prev.filter((x) => x.id !== p.id));
    await supabase.from("completions").insert({ student_name: p.student_name, unit: p.unit, attempts: p.attempts });
    await supabase.from("wrong_problems").delete().eq("id", p.id);
  }

  async function retry(p: DBProblem) {
    const a = p.attempts + 1;
    const warned = a >= p.target_count;
    const patch = warned
      ? { attempts: a, status: "경고", due_date: null as string | null, last_submitted_at: null as string | null }
      : { attempts: a, status: "대기", due_date: nextDue(a), last_submitted_at: null as string | null };
    setProblems((prev) => prev.map((x) => (x.id === p.id ? { ...x, ...patch } : x)));
    await supabase.from("wrong_problems").update(patch).eq("id", p.id);
  }

  async function restart(p: DBProblem) {
    const patch = { status: "대기", due_date: todayISO() };
    setProblems((prev) => prev.map((x) => (x.id === p.id ? { ...x, ...patch } : x)));
    await supabase.from("wrong_problems").update(patch).eq("id", p.id);
  }

  const warn = problems.filter((p) => p.status === "경고");
  const active = problems.filter((p) => p.status !== "경고" && p.status !== "완료");

  return (
    <>
      <button className="btn btn-ghost btn-sm" style={{ marginBottom: 12, paddingLeft: 0 }} onClick={() => router.push("/admin")}>
        <IconChevronLeft size={14} />대시보드
      </button>

      <PageHeader eyebrow={`${grade || "학생"} · 등록 ${problems.length}문항`} title={name} sub="시험지 채점 후 「완료(삭제)」 또는 「다시(재출제)」를 눌러주세요." />

      <div className="grid grid-3">
        <StatCard label="진행 중" value={active.length} unit="문항" />
        <StatCard label="경고" value={warn.length} unit="문항" deltaType="down" />
        <StatCard label="전체 등록" value={problems.length} unit="문항" />
      </div>

      <SectionH title="오답 목록" right={`${problems.length}건`} />

      {loading ? (
        <div className="alert alert-info">불러오는 중…</div>
      ) : problems.length === 0 ? (
        <div className="empty card flat"><h4>등록된 오답이 없습니다</h4></div>
      ) : (
        <div className="stack" style={{ gap: 10 }}>
          {[...active, ...warn].map((p) => {
            const isWarn = p.status === "경고";
            return (
              <div key={p.id} className="card" style={{ padding: 16 }}>
                <div className="row" style={{ gap: 14, alignItems: "flex-start" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={problemImage(p)} alt="문제" style={{ width: 76, height: 76, objectFit: "cover", borderRadius: 12, flexShrink: 0, background: "var(--bg-soft)" }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="row" style={{ gap: 8, marginBottom: 5 }}>
                      {isWarn ? <span className="badge badge-study" style={{ background: "var(--danger-soft)", color: "var(--danger-ink)" }}>⚠️ 경고</span> : <span className="badge badge-study">대기</span>}
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{p.seq != null ? `${p.seq}번 · ` : ""}등록 {md(p.created_at)}</div>
                    {p.unit && <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>📘 {p.unit}</div>}
                    {p.answer && <div style={{ fontSize: 13, color: "var(--done-ink)", fontWeight: 700, marginTop: 4 }}>정답: {p.answer}</div>}
                    <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
                      {isWarn
                        ? `최대 반복(${p.target_count}회) 도달 — 끝까지 못 푼 문항이에요`
                        : `다음 출제 ${p.due_date || "오늘"} · ${p.attempts + 1}/${p.target_count}회차`}
                    </div>
                  </div>
                </div>

                <div className="row" style={{ gap: 8, marginTop: 14, flexWrap: "wrap" }}>
                  <button className="btn btn-primary btn-sm" onClick={() => complete(p)}>✅ 완료 (삭제)</button>
                  {isWarn ? (
                    <button className="btn btn-secondary btn-sm" onClick={() => restart(p)}>🔁 다시 출제하기</button>
                  ) : (
                    <button className="btn btn-secondary btn-sm" onClick={() => retry(p)}>🔁 다시 (재출제)</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
