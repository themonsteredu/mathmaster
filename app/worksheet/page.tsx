"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { DBProblem, problemImage, todayISO } from "@/lib/data";
import { PageHeader } from "@/components/ui";

function md(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

type Sheet = { student: string; rows: DBProblem[] };

export default function WorksheetPage() {
  const [problems, setProblems] = useState<DBProblem[]>([]);
  const [loading, setLoading] = useState(true);

  const [until, setUntil] = useState(todayISO());
  const [who, setWho] = useState("전체");
  const [perPage, setPerPage] = useState<4 | 6>(4);
  const [withAnswers, setWithAnswers] = useState(true);
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

  // 학생별로 묶고, 학생마다 번호순 정렬해 페이지로 나눔
  const { sheets, answerStudents } = useMemo(() => {
    const groups = new Map<string, DBProblem[]>();
    chosen.forEach((p) => {
      const a = groups.get(p.student_name) ?? [];
      a.push(p);
      groups.set(p.student_name, a);
    });
    const sh: Sheet[] = [];
    const ans: { student: string; items: DBProblem[] }[] = [];
    Array.from(groups.entries()).forEach(([student, ps]) => {
      ps.sort((a, b) => (a.seq ?? 1e9) - (b.seq ?? 1e9));
      for (let i = 0; i < ps.length; i += perPage) sh.push({ student, rows: ps.slice(i, i + perPage) });
      if (ps.some((p) => p.answer && p.answer.trim())) ans.push({ student, items: ps });
    });
    return { sheets: sh, answerStudents: ans };
  }, [chosen, perPage]);

  const hasAnswers = answerStudents.length > 0;
  const cellH = perPage === 4 ? "112mm" : "73mm";
  const imgH = perPage === 4 ? "42mm" : "27mm";

  return (
    <>
      <div className="no-print">
        <PageHeader
          eyebrow="시험지"
          title="오답 시험지 만들기"
          sub="학생별로 페이지가 나뉘고 각 시험지에 이름이 찍혀요. 인쇄하거나 PDF로 저장하세요."
          actions={<button className="btn btn-primary" onClick={() => window.print()} disabled={chosen.length === 0}>🖨️ 인쇄 / PDF 저장</button>}
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
          {hasAnswers && (
            <label className="row" style={{ gap: 8, marginTop: 14, cursor: "pointer", fontSize: 14, fontWeight: 600 }}>
              <input type="checkbox" checked={withAnswers} onChange={(e) => setWithAnswers(e.target.checked)} />
              맨 뒤에 정답지도 함께 인쇄
            </label>
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
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{p.seq != null ? `${p.seq}번 · ` : ""}{p.student_name}</div>
                  <div className="muted" style={{ fontSize: 12 }}>{p.due_date ? `출제일 ${p.due_date}` : "출제 대기"}{p.attempts ? ` · ${p.attempts + 1}회차` : ""}{p.answer ? " · 정답 있음" : ""}</div>
                </div>
              </label>
            ))}
          </div>
        )}

        <div className="alert alert-info" style={{ marginBottom: 8 }}>
          💡 아래 미리보기가 실제 인쇄 모양이에요. <b>인쇄 / PDF 저장</b>을 누르면 인쇄창에서 “PDF로 저장”을 고를 수 있어요.
        </div>
      </div>

      {/* 학생별 시험지 페이지 */}
      {sheets.map((sheet, si) => (
        <div key={`s${si}`} className="ws-page">
          <div className="ws-head">
            <span className="t">오답 복습 시험지</span>
            <span style={{ fontSize: 13, color: "#222", fontWeight: 700 }}>이름 {sheet.student} &nbsp;/&nbsp; 날짜 ______</span>
          </div>
          <div className="ws-grid">
            {sheet.rows.map((p, idx) => (
              <div key={p.id} className="ws-cell" style={{ height: cellH }}>
                <div className="ws-cell-head">
                  <span className="ws-no">{p.seq ?? idx + 1}</span>
                  <span>오답일 {md(p.created_at)}</span>
                  <span style={{ marginLeft: "auto", color: "#aaa", fontWeight: 600 }}>{(p.attempts ?? 0) + 1}회차</span>
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="ws-img" src={problemImage(p)} alt="문제" style={{ height: imgH }} />
                <div className="ws-lines" />
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* 정답지 (맨 뒤) */}
      {withAnswers &&
        answerStudents.map((g, gi) => (
          <div key={`a${gi}`} className="ws-page">
            <div className="ws-head">
              <span className="t">정답지</span>
              <span style={{ fontSize: 13, color: "#222", fontWeight: 700 }}>{g.student}</span>
            </div>
            <div className="ans-list">
              {g.items.map((p) => (
                <div key={p.id} className="ans-item">
                  <b>{p.seq ?? "-"}.</b>
                  <span>{p.answer?.trim() || "—"}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
    </>
  );
}
