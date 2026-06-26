"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { DBProblem, DBStudent, todayISO, nextDue, problemImage } from "@/lib/data";
import { PageHeader, StatCard, SectionH, Avatar } from "@/components/ui";
import { IconChevronLeft, IconChevronRight, IconBook } from "@/components/icons";

const DOW = ["일", "월", "화", "수", "목", "금", "토"];
function iso(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export default function TeacherDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [problems, setProblems] = useState<DBProblem[]>([]);
  const [students, setStudents] = useState<DBStudent[]>([]);

  const now = new Date();
  const [vy, setVy] = useState(now.getFullYear());
  const [vm, setVm] = useState(now.getMonth());
  const [selected, setSelected] = useState<string | null>(todayISO());

  useEffect(() => {
    (async () => {
      const [{ data: probs }, { data: studs }] = await Promise.all([
        supabase.from("wrong_problems").select("*").order("created_at", { ascending: false }),
        supabase.from("students").select("*"),
      ]);
      setProblems((probs as DBProblem[]) ?? []);
      setStudents((studs as DBStudent[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const today = todayISO();
  const isActive = (p: DBProblem) => p.status !== "경고" && p.status !== "완료";

  // 출제 예정일별로 묶기
  const byDate = useMemo(() => {
    const m: Record<string, DBProblem[]> = {};
    problems.filter(isActive).forEach((p) => {
      const key = p.due_date || today; // 일정 없는 옛 문항은 오늘로
      (m[key] ||= []).push(p);
    });
    return m;
  }, [problems, today]);

  async function complete(p: DBProblem) {
    if (!confirm(`이 문항을 완료 처리하고 삭제할까요?\n(다시 출제되지 않아요)`)) return;
    setProblems((prev) => prev.filter((x) => x.id !== p.id));
    await supabase.from("wrong_problems").delete().eq("id", p.id);
  }
  async function retry(p: DBProblem) {
    const a = p.attempts + 1;
    const warned = a >= p.target_count;
    const patch = warned ? { attempts: a, status: "경고", due_date: null as string | null } : { attempts: a, status: "대기", due_date: nextDue(a) };
    setProblems((prev) => prev.map((x) => (x.id === p.id ? { ...x, ...patch } : x)));
    await supabase.from("wrong_problems").update(patch).eq("id", p.id);
  }

  // 달력 셀 구성
  const first = new Date(vy, vm, 1);
  const startPad = first.getDay();
  const daysInMonth = new Date(vy, vm + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(startPad).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  const dueTotal = problems.filter((p) => isActive(p) && (!p.due_date || p.due_date <= today)).length;
  const warnTotal = problems.filter((p) => p.status === "경고").length;
  const activeTotal = problems.filter(isActive).length;

  const selectedList = selected ? byDate[selected] ?? [] : [];
  const warnList = problems.filter((p) => p.status === "경고");

  function prevMonth() { if (vm === 0) { setVy(vy - 1); setVm(11); } else setVm(vm - 1); }
  function nextMonth() { if (vm === 11) { setVy(vy + 1); setVm(0); } else setVm(vm + 1); }

  return (
    <>
      <PageHeader
        title="학원 현황"
        sub="달력에서 날짜를 누르면 그날 출제할 오답을 확인하고 바로 관리할 수 있어요."
        actions={<button className="btn btn-primary" onClick={() => router.push("/worksheet")}><IconBook size={14} />시험지 만들기</button>}
      />

      <div className="grid grid-4">
        <StatCard label="등록 학생" value={students.length} unit="명" />
        <StatCard label="오늘 출제 대상" value={dueTotal} unit="문항" deltaType="up" delta={dueTotal > 0 ? "시험지 출력" : ""} />
        <StatCard label="진행 중" value={activeTotal} unit="문항" />
        <StatCard label="경고" value={warnTotal} unit="문항" deltaType="down" delta={warnTotal > 0 ? "확인 필요" : ""} />
      </div>

      {/* 달력 */}
      <div className="card" style={{ padding: 18 }}>
        <div className="cal-bar">
          <button className="btn btn-secondary btn-sm" onClick={prevMonth}><IconChevronLeft size={14} /></button>
          <span className="cal-title">{vy}년 {vm + 1}월</span>
          <button className="btn btn-secondary btn-sm" onClick={nextMonth}><IconChevronRight size={14} /></button>
        </div>
        <div className="cal-grid" style={{ marginBottom: 6 }}>
          {DOW.map((d) => <div key={d} className="cal-dow">{d}</div>)}
        </div>
        <div className="cal-grid">
          {cells.map((d, i) => {
            if (d === null) return <div key={i} className="cal-cell empty" />;
            const key = iso(vy, vm, d);
            const cnt = (byDate[key] ?? []).length;
            const over = cnt > 0 && key < today;
            return (
              <div
                key={i}
                className={`cal-cell ${key === today ? "today" : ""} ${key === selected ? "selected" : ""}`}
                onClick={() => setSelected(key)}
              >
                <span className="cal-num">{d}</span>
                {cnt > 0 && <span className={`cal-badge ${over ? "over" : ""}`}>{cnt}</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* 선택한 날짜의 출제 문항 */}
      <SectionH
        title={selected ? `${selected.slice(5).replace("-", "/")} 출제 문항 (${selectedList.length})` : "날짜를 선택하세요"}
        right={selectedList.length > 0 ? <span style={{ cursor: "pointer" }} onClick={() => router.push("/worksheet")}>시험지 만들기 →</span> : undefined}
      />
      {loading ? (
        <div className="alert alert-info">불러오는 중…</div>
      ) : selectedList.length === 0 ? (
        <div className="card flat" style={{ padding: 22, textAlign: "center", color: "var(--muted)" }}>이 날짜에 출제할 오답이 없어요.</div>
      ) : (
        <div className="stack" style={{ gap: 10 }}>
          {selectedList.map((p) => (
            <div key={p.id} className="card" style={{ padding: 12, display: "flex", gap: 12, alignItems: "center" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={problemImage(p)} alt="" style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 8, background: "var(--bg-soft)", flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="row" style={{ gap: 8 }}>
                  <Avatar name={p.student_name} />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{p.student_name}</div>
                    <div className="muted" style={{ fontSize: 12 }}>{p.attempts + 1}/{p.target_count}회차</div>
                  </div>
                </div>
              </div>
              <div className="row" style={{ gap: 6, flexShrink: 0, flexWrap: "wrap", justifyContent: "flex-end" }}>
                <button className="btn btn-primary btn-sm" onClick={() => complete(p)}>✅ 완료(삭제)</button>
                <button className="btn btn-secondary btn-sm" onClick={() => retry(p)}>🔁 다시</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 경고 문항 */}
      {warnList.length > 0 && (
        <>
          <SectionH title={`⚠️ 경고 문항 (${warnList.length})`} />
          <div className="stack" style={{ gap: 10 }}>
            {warnList.map((p) => (
              <div key={p.id} className="card" style={{ padding: 12, display: "flex", gap: 12, alignItems: "center" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={problemImage(p)} alt="" style={{ width: 48, height: 48, objectFit: "cover", borderRadius: 8, background: "var(--bg-soft)", flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{p.student_name}</div>
                  <div className="muted" style={{ fontSize: 12 }}>최대 반복 도달 — 끝까지 못 푼 문항</div>
                </div>
                <button className="btn btn-primary btn-sm" onClick={() => complete(p)}>✅ 완료(삭제)</button>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}
