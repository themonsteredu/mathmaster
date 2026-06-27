"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { setStudent } from "@/lib/student";
import { PageHeader, Avatar } from "@/components/ui";

export default function StudentLogin() {
  const router = useRouter();
  const [names, setNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("students").select("name").order("name").then(({ data }) => {
      setNames((data ?? []).map((s) => s.name));
      setLoading(false);
    });
  }, []);

  function pick(name: string) {
    setStudent(name);
    router.push("/student/box");
  }

  return (
    <>
      <PageHeader title="이름을 선택하세요" sub="자기 이름을 누르면 내 오답함으로 들어가요." />
      {loading ? (
        <div className="alert alert-info">불러오는 중…</div>
      ) : names.length === 0 ? (
        <div className="empty card flat"><h4>등록된 학생이 없어요</h4>선생님께 학생 등록을 요청하세요.</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10 }}>
          {names.map((n) => (
            <button key={n} className="card card-hover" style={{ padding: 18, display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }} onClick={() => pick(n)}>
              <Avatar name={n} />
              <span style={{ fontWeight: 800, fontSize: 16 }}>{n}</span>
            </button>
          ))}
        </div>
      )}
    </>
  );
}
