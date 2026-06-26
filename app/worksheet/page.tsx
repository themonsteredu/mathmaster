"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { DBProblem, problemImage, todayISO } from "@/lib/data";
import { PageHeader } from "@/components/ui";

export default function WorksheetPage() {
  const [problems, setProblems] = useState<DBProblem[]>([]);
  const [loading, setLoading] = useState(true);

  const [until, setUntil] = useState(todayISO());
  const [who, setWho] = useState("전체");
  const [perPage, setPerPage] = useState<4 | 6>(4);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    supabase.from("wrong_problems").select("*").order("created_at", { ascending: false }).then(({ data }) => {
      setProblems((data as DBProblem[]) ?? []);
      setLoading(false);
    });
  }, []);

  const names = ["전체", ...Array.from(new Set(problems.map((p) => p.student_name)))];

  const due = useMemo(() => {
    return problems.filter((p) => {
      if (p.status === "경고" || p.status === "완료") return false;
      if (who !== "전체" && p.student_name !== who) return false;
      if (!p.due_date) return true;
      return p.due_date <= until;
    });
  }, [problems, until, who]);

  useEffect(() => {
    if (!touched) setSelected(new Set(due.map((p) => p.id)));
  }, [due, touched]);

  function toggle(id: string) {
    setTouched(true);
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  const chosen = due.filter((p) => selected.has(p.id));
  const pages: DBProblem[][] = [];
  for (let i = 0; i < chosen.length; i += perPage) pages.push(chosen.slice(i, i + perPage));

  // 칸 높이·사진 높이 고정 (모든 칸 동일)
  const cellH = perPage === 4 ? "128mm" : "84mm";
  const imgH = perPage === 4 ? "46mm" : "30mm";

  return (
    <>
      <div className="no-print">
        <PageHeader
          eyebrow="시험지"
          title="오답 시험지 만들기"
          sub="출제할 때가 된 오답(낙서 제거본)이 A4 2단으로 정리돼요. 인쇄하거나 PDF로 저장하세요."
          actions={
            <button className="btn btn-primary" onClick={() => window.print()} disabled={chosen.length === 0}>🖨️ 인쇄 / PDF 저장</button>
          }
        />

        <div className="card" style={{ padding: 18, marginBottom: 16 }}>
          <div className="row" style={{ gap: 14, flexWrap: "wrap", alignItems: "flex-end" }}>
            <div>
              <label className="label">기준일 (이 날짜까지 출제할 오답)</label>
              <input className="input" type="date" value={until} onChange={(e) => { setUntil(e.target.value); setTouched(false); }} />
            </div>
            <div>
              <label className="label">한 페이지 문항 수</label>
              <div className="row" style={{ gap: 6 }}>
                {[4, 6].map((n) => (
                  <button key={n} className={`btn btn-sm ${perPage === n ? "btn-primary" : "btn-secondary"}`} onClick={() => setPerPage(n as 4 | 6)}>{n}문항</button>
                ))}
              </div>
            </div>
          </div>
          {names.length > 2 && (
            <div className="row" style={{ gap: 6, flexWrap: "wrap", marginTop: 14 }}>
              {names.map((n) => (
                <button key={n} className={`btn btn-sm ${who === n ? "btn-primary" : "btn-secondary"}`} onClick={() => { setWho(n); setTouched(false); }}>{n}</button>
              ))}
            </div>
          )}
        </div>

        <div className="section-h"><h2>포함할 문항 ({chosen.length}/{due.length})</h2></div>
        {loading ? (
          <div className="alert alert-info">불러오는 중…</div>
        ) : due.length === 0 ? (
          <div className="empty card flat"><h4>출제할 오답이 없어요</h4>아직 출제일이 안 됐거나, 오답을 먼저 등록해 주세요. (기준일을 미래로 바꿔도 돼요)</div>
        ) : (
          <div className="stack" style={{ gap: 8, marginBottom: 18 }}>
            {due.map((p) => (
              <label key={p.id} className="card" style={{ padding: 12, display: "flex", gap: 12, alignItems: "center", cursor: "pointer" }}>
                <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggle(p.id)} />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={problemImage(p)} alt="" style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 8, background: "var(--bg-soft)" }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{p.student_name}</div>
                  <div className="muted" style={{ fontSize: 12 }}>{p.due_date ? `출제일 ${p.due_date}` : "출제 대기"}{p.attempts ? ` · ${p.attempts + 1}회차` : ""}</div>
                </div>
              </label>
            ))}
          </div>
        )}

        <div className="alert alert-info" style={{ marginBottom: 8 }}>
          💡 아래 미리보기가 실제 인쇄 모양이에요. <b>인쇄 / PDF 저장</b>을 누르면 인쇄창에서 “PDF로 저장”을 고를 수 있어요.
        </div>
      </div>

      {pages.map((page, pi) => (
        <div key={pi} className="ws-page">
          <div className="ws-head">
            <span className="t">오답 복습 시험지</span>
            <span style={{ fontSize: 12, color: "#555" }}>{who !== "전체" ? `${who} · ` : ""}이름 __________ / 날짜 ______</span>
          </div>
          <div className="ws-grid">
            {page.map((p, idx) => (
              <div key={p.id} className="ws-cell" style={{ height: cellH }}>
                <div className="ws-cell-head">
                  <span className="ws-no">{pi * perPage + idx + 1}</span>
                  <span>{p.student_name}</span>
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="ws-img" src={problemImage(p)} alt="문제" style={{ height: imgH }} />
                <div className="ws-lines" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </>
  );
}
