"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { DBProblem, DBStudent, todayISO } from "@/lib/data";
import { PageHeader, StatCard, SectionH, Avatar } from "@/components/ui";
import { IconChevronRight, IconBook } from "@/components/icons";

export default function TeacherDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [problems, setProblems] = useState<DBProblem[]>([]);
  const [students, setStudents] = useState<DBStudent[]>([]);

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
  const gradeOf = (name: string) => students.find((s) => s.name === name)?.grade || "";
  const isActive = (p: DBProblem) => p.status !== "경고" && p.status !== "완료";
  const isDue = (p: DBProblem) => isActive(p) && (!p.due_date || p.due_date <= today);

  const names = Array.from(new Set(problems.map((p) => p.student_name)));
  const rows = names
    .map((name) => {
      const ps = problems.filter((p) => p.student_name === name);
      return {
        name,
        grade: gradeOf(name),
        active: ps.filter(isActive).length,
        warn: ps.filter((p) => p.status === "경고").length,
        due: ps.filter(isDue).length,
      };
    })
    .sort((a, b) => b.due - a.due || b.warn - a.warn);

  const dueTotal = problems.filter(isDue).length;
  const warnTotal = problems.filter((p) => p.status === "경고").length;
  const activeTotal = problems.filter(isActive).length;

  const todayLabel = new Date().toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "long" });

  return (
    <>
      <PageHeader
        eyebrow={`${todayLabel}`}
        title="학원 현황"
        sub="오늘 출제할 오답과 경고 문항을 한눈에 살펴봅니다."
        actions={
          <button className="btn btn-primary" onClick={() => router.push("/worksheet")}>
            <IconBook size={14} />시험지 만들기
          </button>
        }
      />

      <div className="grid grid-4">
        <StatCard label="등록 학생" value={students.length} unit="명" />
        <StatCard label="오늘 출제 대상" value={dueTotal} unit="문항" delta={dueTotal > 0 ? "시험지 출력" : ""} deltaType="up" />
        <StatCard label="진행 중" value={activeTotal} unit="문항" />
        <StatCard label="경고" value={warnTotal} unit="문항" delta={warnTotal > 0 ? "확인 필요" : ""} deltaType="down" />
      </div>

      <SectionH title="학생 현황" right={<span onClick={() => router.push("/students")} style={{ cursor: "pointer" }}>전체 보기 →</span>} />

      {loading ? (
        <div className="alert alert-info">불러오는 중…</div>
      ) : rows.length === 0 ? (
        <div className="empty card flat"><h4>아직 등록된 오답이 없습니다</h4>오답을 등록하면 여기에 표시됩니다.</div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <table className="table">
            <thead>
              <tr>
                <th>학생</th>
                <th style={{ width: 110 }}>오늘 출제</th>
                <th style={{ width: 90 }}>진행 중</th>
                <th style={{ width: 90 }}>경고</th>
                <th style={{ width: 44 }}></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.name} className="row-link" onClick={() => router.push(`/admin/student/${encodeURIComponent(r.name)}`)}>
                  <td>
                    <span className="name">
                      <Avatar name={r.name} />
                      <span>{r.name}{r.grade && <span className="muted" style={{ fontWeight: 400, marginLeft: 8, fontSize: 12 }}>{r.grade}</span>}</span>
                    </span>
                  </td>
                  <td>{r.due > 0 ? <span className="chip chip-accent"><span className="dot" />{r.due}건</span> : <span className="faint">—</span>}</td>
                  <td><span className="num">{r.active}</span></td>
                  <td>{r.warn > 0 ? <span className="chip chip-danger"><span className="dot" />{r.warn}건</span> : <span className="faint">—</span>}</td>
                  <td><IconChevronRight size={16} className="faint" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
