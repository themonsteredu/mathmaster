"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { DBProblem, DBStudent, problemImage, nextDue, todayISO } from "@/lib/data";
import { PageHeader, Avatar } from "@/components/ui";

function md(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export default function GalleryPage() {
  const [problems, setProblems] = useState<DBProblem[]>([]);
  const [students, setStudents] = useState<DBStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [who, setWho] = useState("전체");
  const [stat, setStat] = useState<"전체" | "대기" | "경고">("전체");
  const [zoom, setZoom] = useState<DBProblem | null>(null);
  const [sols, setSols] = useState<Record<string, { id: string; solution_image_url: string; solved_at: string }[]>>({});

  async function loadSols(pid: string) {
    if (sols[pid]) return;
    const { data } = await supabase.from("solution_logs").select("*").eq("problem_id", pid).order("solved_at", { ascending: true });
    setSols((prev) => ({ ...prev, [pid]: (data as { id: string; solution_image_url: string; solved_at: string }[]) ?? [] }));
  }

  async function load() {
    const [{ data: probs }, { data: studs }] = await Promise.all([
      supabase.from("wrong_problems").select("*").order("seq", { ascending: true }),
      supabase.from("students").select("*"),
    ]);
    setProblems((probs as DBProblem[]) ?? []);
    setStudents((studs as DBStudent[]) ?? []);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  const gradeOf = (n: string) => students.find((s) => s.name === n)?.grade || "";

  async function complete(p: DBProblem) {
    if (!confirm(`이 문항을 완료 처리하고 삭제할까요?`)) return;
    setProblems((prev) => prev.filter((x) => x.id !== p.id));
    setZoom(null);
    await supabase.from("wrong_problems").delete().eq("id", p.id);
  }
  async function retry(p: DBProblem) {
    const a = p.attempts + 1;
    const warned = a >= p.target_count;
    const patch = warned
      ? { attempts: a, status: "경고", due_date: null as string | null, last_submitted_at: null as string | null }
      : { attempts: a, status: "대기", due_date: nextDue(a), last_submitted_at: null as string | null };
    setProblems((prev) => prev.map((x) => (x.id === p.id ? { ...x, ...patch } : x)));
    setZoom((z) => (z && z.id === p.id ? { ...z, ...patch } : z));
    await supabase.from("wrong_problems").update(patch).eq("id", p.id);
  }

  const names = ["전체", ...Array.from(new Set(problems.map((p) => p.student_name)))];

  const filtered = useMemo(() => {
    return problems.filter((p) => {
      if (p.status === "완료") return false;
      if (who !== "전체" && p.student_name !== who) return false;
      if (stat === "대기") return p.status !== "경고";
      if (stat === "경고") return p.status === "경고";
      return true;
    });
  }, [problems, who, stat]);

  const groups = useMemo(() => {
    const m = new Map<string, DBProblem[]>();
    filtered.forEach((p) => {
      const a = m.get(p.student_name) ?? [];
      a.push(p);
      m.set(p.student_name, a);
    });
    return Array.from(m.entries());
  }, [filtered]);

  return (
    <>
      <PageHeader eyebrow="문항 보기" title="학생별 오답 모아보기" sub="학생마다 오답을 한눈에 훑어보고, 눌러서 크게 보거나 바로 완료/다시 처리하세요." />

      <div className="row" style={{ gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
        {(["전체", "대기", "경고"] as const).map((s) => (
          <button key={s} className={`btn btn-sm ${stat === s ? "btn-primary" : "btn-secondary"}`} onClick={() => setStat(s)}>{s}</button>
        ))}
      </div>
      {names.length > 2 && (
        <div className="row" style={{ gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
          {names.map((n) => (
            <button key={n} className={`btn btn-sm ${who === n ? "btn-primary" : "btn-secondary"}`} onClick={() => setWho(n)}>{n}</button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="alert alert-info">불러오는 중…</div>
      ) : groups.length === 0 ? (
        <div className="empty card flat"><h4>표시할 오답이 없어요</h4></div>
      ) : (
        groups.map(([name, ps]) => (
          <div key={name} style={{ marginBottom: 26 }}>
            <div className="row" style={{ gap: 10, marginBottom: 12 }}>
              <Avatar name={name} />
              <div>
                <div style={{ fontWeight: 800, fontSize: 16 }}>{name} <span className="muted" style={{ fontWeight: 400, fontSize: 13 }}>{gradeOf(name)}</span></div>
                <div className="muted" style={{ fontSize: 12 }}>오답 {ps.length}개{ps.some((p) => p.status === "경고") ? ` · 경고 ${ps.filter((p) => p.status === "경고").length}` : ""}</div>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10 }}>
              {ps.map((p) => {
                const warn = p.status === "경고";
                return (
                  <div key={p.id} className="card" style={{ padding: 8, overflow: "hidden" }}>
                    <button onClick={() => setZoom(p)} style={{ display: "block", width: "100%", border: "none", background: "none", padding: 0, cursor: "zoom-in" }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={problemImage(p)} alt="" style={{ width: "100%", height: 130, objectFit: "cover", borderRadius: 8, background: "var(--bg-soft)" }} />
                    </button>
                    <div className="row" style={{ justifyContent: "space-between", marginTop: 7 }}>
                      <span style={{ fontWeight: 800, fontSize: 13 }}>{p.seq != null ? `${p.seq}번` : "—"}</span>
                      {warn ? <span className="chip chip-danger" style={{ padding: "2px 7px" }}><span className="dot" />경고</span> : <span className="muted" style={{ fontSize: 12 }}>{p.attempts + 1}회차</span>}
                    </div>
                    {p.last_submitted_at && <div className="chip chip-accent" style={{ marginTop: 5, padding: "2px 8px" }}><span className="dot" />🆕 새 풀이</div>}
                    {p.answer && <div style={{ fontSize: 12, color: "var(--done-ink)", fontWeight: 700, marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>정답: {p.answer}</div>}
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}

      {/* 크게 보기 모달 */}
      {zoom && (
        <div
          onClick={() => setZoom(null)}
          style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(15,23,42,0.75)", display: "flex", alignItems: "center", justifyContent: "center", padding: 18 }}
        >
          <div className="card" style={{ padding: 16, maxWidth: 560, width: "100%", maxHeight: "90vh", overflow: "auto" }} onClick={(e) => e.stopPropagation()}>
            <div className="row" style={{ justifyContent: "space-between", marginBottom: 10 }}>
              <div style={{ fontWeight: 800 }}>{zoom.seq != null ? `${zoom.seq}번 · ` : ""}{zoom.student_name} <span className="muted" style={{ fontWeight: 400, fontSize: 13 }}>· 등록 {md(zoom.created_at)}</span></div>
              <button className="btn btn-ghost btn-sm" onClick={() => setZoom(null)}>닫기 ✕</button>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={problemImage(zoom)} alt="" style={{ width: "100%", maxHeight: "55vh", objectFit: "contain", borderRadius: 10, background: "var(--bg-soft)" }} />
            {zoom.answer && <div className="alert alert-ok" style={{ marginTop: 12, marginBottom: 0 }}>정답: {zoom.answer}</div>}
            <div className="muted" style={{ fontSize: 13, marginTop: 10 }}>
              {zoom.status === "경고" ? "⚠️ 경고 문항 (최대 반복 도달)" : `다음 출제 ${zoom.due_date || "오늘"} · ${zoom.attempts + 1}/${zoom.target_count}회차`}
            </div>

            {/* 학생이 올린 풀이 보기 */}
            <button className="btn btn-secondary btn-block btn-sm" style={{ marginTop: 12 }} onClick={() => loadSols(zoom.id)}>
              🖼️ 학생이 올린 풀이 보기
            </button>
            {sols[zoom.id] && (
              <div className="row" style={{ gap: 10, flexWrap: "wrap", marginTop: 12 }}>
                {sols[zoom.id].length === 0 && <span className="faint" style={{ fontSize: 13 }}>아직 올라온 풀이가 없어요.</span>}
                {sols[zoom.id].map((l, i) => (
                  <a key={l.id} href={l.solution_image_url} target="_blank" rel="noreferrer" style={{ position: "relative" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={l.solution_image_url} alt={`풀이 ${i + 1}`} style={{ width: 92, height: 92, objectFit: "cover", borderRadius: 10, border: "1px solid var(--line)" }} />
                  </a>
                ))}
              </div>
            )}

            <div className="row" style={{ gap: 8, marginTop: 14 }}>
              <button className="btn btn-primary" onClick={() => complete(zoom)}>✅ 완료(삭제)</button>
              {zoom.status !== "경고" && <button className="btn btn-secondary" onClick={() => retry(zoom)}>🔁 다시(재출제)</button>}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
