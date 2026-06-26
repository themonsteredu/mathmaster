"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { DBProblem, problemTitle, problemTopic, problemImage } from "@/lib/data";
import { PageHeader } from "@/components/ui";

function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function WorksheetPage() {
  const [problems, setProblems] = useState<DBProblem[]>([]);
  const [loading, setLoading] = useState(true);

  const today = new Date();
  const weekAgo = new Date();
  weekAgo.setDate(today.getDate() - 6);

  const [from, setFrom] = useState(ymd(weekAgo));
  const [to, setTo] = useState(ymd(today));
  const [who, setWho] = useState("전체");
  const [perPage, setPerPage] = useState<4 | 6>(4);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [touched, setTouched] = useState(false);

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

  // 기간 + 학생으로 거른 대상
  const inRange = useMemo(() => {
    const f = new Date(from + "T00:00:00").getTime();
    const t = new Date(to + "T23:59:59").getTime();
    return problems.filter((p) => {
      const c = new Date(p.created_at).getTime();
      return c >= f && c <= t && (who === "전체" || p.student_name === who);
    });
  }, [problems, from, to, who]);

  // 기본 선택 = 기간 내 전부 (사용자가 손대기 전까지 자동 동기화)
  useEffect(() => {
    if (!touched) setSelected(new Set(inRange.map((p) => p.id)));
  }, [inRange, touched]);

  function toggle(id: string) {
    setTouched(true);
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  const chosen = inRange.filter((p) => selected.has(p.id));
  const pages: DBProblem[][] = [];
  for (let i = 0; i < chosen.length; i += perPage) pages.push(chosen.slice(i, i + perPage));

  const imgMax = perPage === 4 ? "52mm" : "34mm";
  const cellMin = perPage === 4 ? "120mm" : "80mm";

  return (
    <>
      <div className="no-print">
        <PageHeader
          eyebrow="시험지"
          title="오답 시험지 만들기"
          sub="기간을 고르면 그 기간의 오답(낙서 제거본)이 A4 2단으로 정리돼요. 인쇄하거나 PDF로 저장하세요."
          actions={
            <button className="btn btn-primary" onClick={() => window.print()} disabled={chosen.length === 0}>
              🖨️ 인쇄 / PDF 저장
            </button>
          }
        />

        <div className="card" style={{ padding: 18, marginBottom: 16 }}>
          <div className="row" style={{ gap: 14, flexWrap: "wrap", alignItems: "flex-end" }}>
            <div>
              <label className="label">시작일</label>
              <input className="input" type="date" value={from} onChange={(e) => { setFrom(e.target.value); setTouched(false); }} />
            </div>
            <div>
              <label className="label">종료일</label>
              <input className="input" type="date" value={to} onChange={(e) => { setTo(e.target.value); setTouched(false); }} />
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

        {/* 포함할 문항 선택 */}
        <div className="section-h"><h2>포함할 문항 ({chosen.length}/{inRange.length})</h2></div>
        {loading ? (
          <div className="alert alert-info">불러오는 중…</div>
        ) : inRange.length === 0 ? (
          <div className="empty card flat"><h4>해당 기간에 오답이 없어요</h4>기간을 바꾸거나 오답을 먼저 등록해 주세요.</div>
        ) : (
          <div className="stack" style={{ gap: 8, marginBottom: 18 }}>
            {inRange.map((p) => (
              <label key={p.id} className="card" style={{ padding: 12, display: "flex", gap: 12, alignItems: "center", cursor: "pointer" }}>
                <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggle(p.id)} />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={problemImage(p)} alt="" style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 8, background: "var(--bg-soft)" }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{problemTitle(p)} <span className="muted" style={{ fontWeight: 400 }}>· {p.student_name}</span></div>
                  <div className="muted" style={{ fontSize: 12 }}>{problemTopic(p)}</div>
                </div>
              </label>
            ))}
          </div>
        )}

        <div className="alert alert-info" style={{ marginBottom: 8 }}>
          💡 미리보기 ↓ 가 실제 인쇄 모양이에요. <b>인쇄 / PDF 저장</b>을 누르면 인쇄창에서 “PDF로 저장”을 고를 수 있어요.
        </div>
      </div>

      {/* 인쇄 영역 (미리보기 = 실제 출력) */}
      {pages.map((page, pi) => (
        <div key={pi} className="ws-page">
          <div className="ws-head">
            <span className="t">오답 복습 시험지</span>
            <span style={{ fontSize: 12, color: "#555" }}>
              {who !== "전체" ? `${who} · ` : ""}이름 __________ / 날짜 ______
            </span>
          </div>
          <div className="ws-grid">
            {page.map((p, idx) => (
              <div key={p.id} className="ws-cell" style={{ minHeight: cellMin }}>
                <div className="ws-cell-head">
                  <span className="ws-no">{pi * perPage + idx + 1}</span>
                  <span>{p.student_name}</span>
                  <span style={{ color: "#999" }}>· {problemTopic(p)}</span>
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="ws-img" src={problemImage(p)} alt="문제" style={{ maxHeight: imgMax }} />
                <div className="ws-lines" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </>
  );
}
