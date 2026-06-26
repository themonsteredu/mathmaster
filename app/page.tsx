"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { DBProblem, statusKey, problemTitle, problemTopic, summarize } from "@/lib/data";
import { PageHeader, StatCard, SectionH, StatusChip, ProgressDots } from "@/components/ui";
import { IconPlus, IconChevronRight, IllustEmpty } from "@/components/icons";

function md(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export default function StudentHome() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [problems, setProblems] = useState<DBProblem[]>([]);
  const [who, setWho] = useState("전체");

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
  const mine = who === "전체" ? problems : problems.filter((p) => p.student_name === who);
  const sm = summarize(mine);
  const todo = mine.filter((p) => statusKey(p) !== "done");
  const recentDone = mine.filter((p) => statusKey(p) === "done").slice(0, 3);

  return (
    <>
      <PageHeader
        eyebrow="오늘도 반복 학습으로 실력을 다져요"
        title="오늘의 학습"
        sub={`풀어야 할 문제 ${todo.length}개 · 완료 ${sm.done}개`}
        actions={
          <button className="btn btn-primary" onClick={() => router.push("/upload")}>
            <IconPlus size={14} />새 오답 등록
          </button>
        }
      />

      <div className="grid grid-3">
        <StatCard label="학습중" value={sm.study + sm.fresh} unit="문제" />
        <StatCard label="완료" value={sm.done} unit="문제" />
        <StatCard label="전체 진행률" value={sm.progress} unit="%" />
      </div>

      {names.length > 2 && (
        <div className="row" style={{ gap: 6, flexWrap: "wrap", marginBottom: 4 }}>
          {names.map((n) => (
            <button
              key={n}
              className={`btn btn-sm ${who === n ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setWho(n)}
            >
              {n}
            </button>
          ))}
        </div>
      )}

      <SectionH title="풀어야 할 문제" right={todo.length > 0 ? `${todo.length}건` : ""} />

      {loading ? (
        <div className="alert alert-info">불러오는 중…</div>
      ) : todo.length === 0 ? (
        <div className="empty card flat">
          <IllustEmpty size={96} />
          <h4>풀 문제가 없습니다</h4>
          새 오답을 등록하거나 잠시 쉬어가도 좋아요.
        </div>
      ) : (
        <div className="stack" style={{ gap: 10 }}>
          {todo.map((p) => (
            <button
              key={p.id}
              className="card card-hover"
              style={{ padding: 18, textAlign: "left", width: "100%", background: "var(--surface)" }}
              onClick={() => router.push("/box")}
            >
              <div className="row-between" style={{ alignItems: "flex-start", gap: 14 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="row" style={{ gap: 8, marginBottom: 6 }}>
                    <StatusChip status={statusKey(p)} />
                    <span className="muted" style={{ fontSize: 12 }}>{p.student_name} · 등록 {md(p.created_at)}</span>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{problemTitle(p)}</div>
                  <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>{problemTopic(p)}</div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontSize: 10.5, color: "var(--muted)", marginBottom: 5, letterSpacing: "0.1em", textTransform: "uppercase" }}>반복</div>
                  <ProgressDots total={p.target_count} done={p.done_count} current={statusKey(p) === "study"} />
                  <div className="num" style={{ marginTop: 6, fontSize: 13 }}>{p.done_count}/{p.target_count}</div>
                </div>
                <IconChevronRight size={18} className="faint" />
              </div>
            </button>
          ))}
        </div>
      )}

      {recentDone.length > 0 && (
        <>
          <SectionH title="최근 완료한 문제" />
          <div className="stack" style={{ gap: 8 }}>
            {recentDone.map((p) => (
              <div key={p.id} className="card flat" style={{ padding: 14 }}>
                <div className="row-between">
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{problemTitle(p)}</div>
                    <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>{p.student_name} · {problemTopic(p)}</div>
                  </div>
                  <span className="chip chip-done"><span className="dot" />완료</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}
