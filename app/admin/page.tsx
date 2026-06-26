"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { DBProblem, DBStudent, statusKey, summarize } from "@/lib/data";
import { PageHeader, StatCard, SectionH, Avatar } from "@/components/ui";
import { IconChevronRight, IconPlus } from "@/components/icons";

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

  const gradeOf = (name: string) => students.find((s) => s.name === name)?.grade || "";

  // 학생별 묶기 (문제가 있는 학생)
  const names = Array.from(new Set(problems.map((p) => p.student_name)));
  const rows = names
    .map((name) => ({ name, grade: gradeOf(name), sm: summarize(problems.filter((p) => p.student_name === name)) }))
    .sort((a, b) => b.sm.fresh - a.sm.fresh || a.sm.progress - b.sm.progress);

  const study = problems.filter((p) => statusKey(p) === "study").length;
  const done = problems.filter((p) => statusKey(p) === "done").length;
  const fresh = problems.filter((p) => statusKey(p) === "new").length;

  const today = new Date().toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "long" });

  return (
    <>
      <PageHeader
        eyebrow={`${today} · 오늘의 학습`}
        title="학원 현황"
        sub="전체 학생의 학습 진행 상황을 한눈에 살펴봅니다."
        actions={
          <button className="btn btn-primary" onClick={() => router.push("/students")}>
            <IconPlus size={14} />학생 추가
          </button>
        }
      />

      <div className="grid grid-4">
        <StatCard label="등록 학생" value={students.length} unit="명" hint={`현황 ${names.length}명`} />
        <StatCard label="학습중" value={study} unit="문제" />
        <StatCard label="완료" value={done} unit="문제" deltaType="up" />
        <StatCard label="신규 오답" value={fresh} unit="건" delta={fresh > 0 ? "확인 필요" : ""} deltaType="down" />
      </div>

      <SectionH title="학생 현황" right={<span onClick={() => router.push("/students")} style={{ cursor: "pointer" }}>전체 보기 →</span>} />

      {loading ? (
        <div className="alert alert-info">불러오는 중…</div>
      ) : rows.length === 0 ? (
        <div className="empty card flat"><h4>아직 등록된 오답이 없습니다</h4>학생이 오답을 등록하면 여기에 표시됩니다.</div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <table className="table">
            <thead>
              <tr>
                <th>학생</th>
                <th style={{ width: "26%" }}>진행률</th>
                <th style={{ width: 80 }}>학습중</th>
                <th style={{ width: 80 }}>완료</th>
                <th style={{ width: 90 }}>신규</th>
                <th style={{ width: 44 }}></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.name} className="row-link" onClick={() => router.push(`/admin/student/${encodeURIComponent(r.name)}`)}>
                  <td>
                    <span className="name">
                      <Avatar name={r.name} />
                      <span>
                        {r.name}
                        {r.grade && <span className="muted" style={{ fontWeight: 400, marginLeft: 8, fontSize: 12 }}>{r.grade}</span>}
                      </span>
                    </span>
                  </td>
                  <td>
                    <div className="row" style={{ gap: 10 }}>
                      <div className="bar" style={{ flex: 1, maxWidth: 130 }}>
                        <div className="fill" style={{ width: r.sm.progress + "%" }} />
                      </div>
                      <span className="num" style={{ fontSize: 13 }}>{r.sm.progress}%</span>
                    </div>
                  </td>
                  <td><span className="num">{r.sm.study + r.sm.fresh}</span></td>
                  <td><span className="num">{r.sm.done}</span></td>
                  <td>{r.sm.fresh > 0 ? <span className="chip chip-danger"><span className="dot" />{r.sm.fresh}건</span> : <span className="faint">—</span>}</td>
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
