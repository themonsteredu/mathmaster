"use client";

import { useEffect, useState } from "react";
import { supabase, PHOTO_BUCKET } from "@/lib/supabase";
import { DBProblem, statusKey, problemTitle, problemTopic } from "@/lib/data";
import { PageHeader, StatusChip, ProgressDots } from "@/components/ui";
import { IllustEmpty } from "@/components/icons";

export default function BoxPage() {
  const [loading, setLoading] = useState(true);
  const [problems, setProblems] = useState<DBProblem[]>([]);
  const [who, setWho] = useState("전체");
  const [tab, setTab] = useState<"all" | "study" | "done">("all");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    supabase
      .from("wrong_problems")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setProblems((data as DBProblem[]) ?? []);
        setLoading(false);
      });
  }, []);

  async function handleSolution(p: DBProblem, file: File | undefined | null) {
    if (!file) return;
    setBusyId(p.id);
    setBanner(null);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `solutions/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from(PHOTO_BUCKET).upload(path, file);
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path);

      const { error: logErr } = await supabase.from("solution_logs").insert({ problem_id: p.id, solution_image_url: pub.publicUrl });
      if (logErr) throw logErr;

      const newDone = p.done_count + 1;
      const completed = newDone >= p.target_count;
      const { error: updErr } = await supabase.from("wrong_problems").update({ done_count: newDone, status: completed ? "완료" : "학습중" }).eq("id", p.id);
      if (updErr) throw updErr;

      setProblems((prev) => prev.map((x) => (x.id === p.id ? { ...x, done_count: newDone, status: completed ? "완료" : "학습중" } : x)));
      setBanner({
        type: "ok",
        text: completed ? `🎉 ${p.student_name} 학생, ${p.target_count}회 모두 완료!` : `✅ 풀이 1회 인정! 이제 ${newDone}/${p.target_count}회예요.`,
      });
    } catch (e) {
      const text = e instanceof Error ? e.message : "알 수 없는 오류가 났어요.";
      setBanner({ type: "err", text: `풀이 등록 실패: ${text}` });
    } finally {
      setBusyId(null);
    }
  }

  const names = ["전체", ...Array.from(new Set(problems.map((p) => p.student_name)))];
  const byWho = who === "전체" ? problems : problems.filter((p) => p.student_name === who);
  const tabs = [
    { id: "all" as const, label: "전체", count: byWho.length },
    { id: "study" as const, label: "학습중", count: byWho.filter((p) => statusKey(p) !== "done").length },
    { id: "done" as const, label: "완료", count: byWho.filter((p) => statusKey(p) === "done").length },
  ];
  const visible = byWho.filter((p) => (tab === "all" ? true : tab === "done" ? statusKey(p) === "done" : statusKey(p) !== "done"));

  return (
    <>
      <PageHeader eyebrow="내 학습 기록" title="오답함" sub="등록된 오답과 진행 상황입니다. 풀이를 올리면 한 회씩 채워져요." />

      {banner && <div className={`alert ${banner.type === "ok" ? "alert-ok" : "alert-err"}`}>{banner.text}</div>}

      {names.length > 2 && (
        <div className="row" style={{ gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
          {names.map((n) => (
            <button key={n} className={`btn btn-sm ${who === n ? "btn-primary" : "btn-secondary"}`} onClick={() => setWho(n)}>{n}</button>
          ))}
        </div>
      )}

      {/* 탭 */}
      <div className="row" style={{ gap: 4, marginBottom: 16, borderBottom: "1px solid var(--line)" }}>
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "10px 14px",
              fontSize: 14,
              fontWeight: 700,
              color: tab === t.id ? "var(--ink)" : "var(--muted)",
              borderBottom: tab === t.id ? "2px solid var(--ink)" : "2px solid transparent",
              marginBottom: -1,
            }}
          >
            {t.label} <span style={{ fontWeight: 500, color: "var(--faint)", marginLeft: 3 }}>{t.count}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="alert alert-info">불러오는 중…</div>
      ) : visible.length === 0 ? (
        <div className="empty card flat"><IllustEmpty size={96} /><h4>해당 항목이 없습니다</h4></div>
      ) : (
        <div className="stack" style={{ gap: 10 }}>
          {visible.map((p) => {
            const isBusy = busyId === p.id;
            const done = statusKey(p) === "done";
            return (
              <div key={p.id} className="card" style={{ padding: 14, display: "flex", gap: 14 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.problem_image_url} alt="문제" style={{ width: 80, height: 80, objectFit: "cover", borderRadius: 12, flexShrink: 0, background: "var(--bg-soft)" }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="row" style={{ gap: 8, marginBottom: 5 }}>
                    <StatusChip status={statusKey(p)} />
                    <span className="muted" style={{ fontSize: 12 }}>{p.student_name}</span>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{problemTitle(p)}</div>
                  <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>{problemTopic(p)}</div>
                  <div className="row" style={{ gap: 10, marginTop: 10 }}>
                    <ProgressDots total={p.target_count} done={p.done_count} current={!done} />
                    <span className="num" style={{ fontSize: 13 }}>{p.done_count}/{p.target_count}</span>
                    {!done && (
                      <label className={`btn btn-primary btn-sm ${isBusy ? "" : ""}`} style={{ marginLeft: "auto", opacity: isBusy ? 0.6 : 1 }}>
                        {isBusy ? "올리는 중…" : "✏️ 풀이 올리기"}
                        <input type="file" accept="image/*" disabled={busyId !== null} style={{ display: "none" }} onChange={(e) => { handleSolution(p, e.target.files?.[0]); e.target.value = ""; }} />
                      </label>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
