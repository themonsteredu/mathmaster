"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getStudent } from "@/lib/student";
import { DBProblem, problemImage } from "@/lib/data";
import { PageHeader, ProgressDots } from "@/components/ui";
import { IconChevronRight, IllustEmpty } from "@/components/icons";

export default function StudentBox() {
  const router = useRouter();
  const [name, setName] = useState<string | null>(null);
  const [problems, setProblems] = useState<DBProblem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const me = getStudent();
    if (!me) {
      router.replace("/student");
      return;
    }
    setName(me);
    supabase
      .from("wrong_problems")
      .select("*")
      .eq("student_name", me)
      .neq("status", "완료")
      .order("seq", { ascending: true })
      .then(({ data }) => {
        setProblems(((data as DBProblem[]) ?? []).filter((p) => p.status !== "경고"));
        setLoading(false);
      });
  }, [router]);

  return (
    <>
      <PageHeader eyebrow={name ? `${name} 학생` : ""} title="내 오답함" sub="문제를 눌러 풀이 사진을 올리세요." />

      {loading ? (
        <div className="alert alert-info">불러오는 중…</div>
      ) : problems.length === 0 ? (
        <div className="empty card flat"><IllustEmpty size={96} /><h4>풀 오답이 없어요 🎉</h4>오늘은 푹 쉬어도 좋아요.</div>
      ) : (
        <div className="stack" style={{ gap: 10 }}>
          {problems.map((p) => (
            <button key={p.id} className="card card-hover" style={{ padding: 14, display: "flex", gap: 14, alignItems: "center", width: "100%", textAlign: "left" }} onClick={() => router.push(`/student/solve/${p.id}`)}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={problemImage(p)} alt="" style={{ width: 76, height: 76, objectFit: "cover", borderRadius: 12, flexShrink: 0, background: "var(--bg-soft)" }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: 16 }}>{p.seq != null ? `${p.seq}번 문제` : "오답 문제"}</div>
                <div className="row" style={{ gap: 8, marginTop: 8 }}>
                  <ProgressDots total={p.target_count} done={p.attempts} current />
                  {p.last_submitted_at && <span className="chip chip-accent" style={{ padding: "2px 8px" }}><span className="dot" />제출함</span>}
                </div>
              </div>
              <span className="btn btn-primary btn-sm" style={{ flexShrink: 0, pointerEvents: "none" }}>✏️ 풀이</span>
            </button>
          ))}
        </div>
      )}
    </>
  );
}
