"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { DBProblem, statusKey, problemTitle, problemTopic, problemImage } from "@/lib/data";
import { PageHeader, StatusChip, ProgressDots } from "@/components/ui";
import { IllustEmpty, IconChevronRight } from "@/components/icons";

export default function BoxPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [problems, setProblems] = useState<DBProblem[]>([]);
  const [who, setWho] = useState("전체");
  const [tab, setTab] = useState<"all" | "study" | "done">("all");

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
      <PageHeader eyebrow="내 학습 기록" title="오답함" sub="문제를 눌러 풀이 화면으로 들어가세요. 풀이를 올리면 한 회씩 채워져요." />

      {names.length > 2 && (
        <div className="row" style={{ gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
          {names.map((n) => (
            <button key={n} className={`btn btn-sm ${who === n ? "btn-primary" : "btn-secondary"}`} onClick={() => setWho(n)}>{n}</button>
          ))}
        </div>
      )}

      <div className="row" style={{ gap: 4, marginBottom: 16, borderBottom: "1px solid var(--line)" }}>
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{ background: "none", border: "none", cursor: "pointer", padding: "10px 14px", fontSize: 14, fontWeight: 700, color: tab === t.id ? "var(--ink)" : "var(--muted)", borderBottom: tab === t.id ? "2px solid var(--ink)" : "2px solid transparent", marginBottom: -1 }}
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
            const done = statusKey(p) === "done";
            return (
              <button
                key={p.id}
                className="card card-hover"
                style={{ padding: 14, display: "flex", gap: 14, textAlign: "left", width: "100%", alignItems: "center" }}
                onClick={() => router.push(`/solve/${p.id}`)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={problemImage(p)} alt="문제" style={{ width: 80, height: 80, objectFit: "cover", borderRadius: 12, flexShrink: 0, background: "var(--bg-soft)" }} />
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
                  </div>
                </div>
                {!done ? (
                  <span className="btn btn-primary btn-sm" style={{ flexShrink: 0, pointerEvents: "none" }}>✏️ 풀이하기</span>
                ) : (
                  <IconChevronRight size={18} className="faint" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </>
  );
}
