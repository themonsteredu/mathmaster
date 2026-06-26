"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Stats = { studying: number; done: number; students: number };

export default function Home() {
  const [conn, setConn] = useState<"확인중" | "성공" | "실패">("확인중");
  const [stats, setStats] = useState<Stats | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("wrong_problems")
        .select("status, student_name");
      if (error) {
        setConn("실패");
        setErrorMsg(error.message);
        return;
      }
      setConn("성공");
      setStats({
        studying: data.filter((d) => d.status === "학습중").length,
        done: data.filter((d) => d.status === "완료").length,
        students: new Set(data.map((d) => d.student_name)).size,
      });
    })();
  }, []);

  const menus = [
    { href: "/upload", title: "오답 등록", desc: "틀린 문제를 사진으로 올리기", icon: "📸" },
    { href: "/box", title: "학생 오답함", desc: "학습중인 문제 풀이 올리기", icon: "📋" },
    { href: "/admin", title: "원장·선생님 관리", desc: "현황·풀이 확인, 횟수 조정", icon: "🧑‍🏫" },
    { href: "/students", title: "학생 관리", desc: "학생 명단 등록·수정", icon: "🧑‍🎓" },
  ];

  return (
    <>
      <header className="appbar">
        <div className="appbar-inner">
          <span className="appbar-brand">오답 반복학습</span>
        </div>
      </header>

      <main className="container">
        <h1 className="page-title">대시보드</h1>
        <p className="page-sub">틀린 문제를 반복해서 풀고, 진행 상황을 관리하세요.</p>

        {/* 요약 */}
        <div style={{ display: "flex", gap: 10, marginBottom: 18 }}>
          <StatBox label="학생" value={stats?.students} />
          <StatBox label="학습중" value={stats?.studying} accent="var(--study-fg)" />
          <StatBox label="완료" value={stats?.done} accent="var(--done-fg)" />
        </div>

        {/* 메뉴 */}
        <div style={{ display: "grid", gap: 12 }}>
          {menus.map((m) => (
            <Link key={m.href} href={m.href} className="card" style={menuCard}>
              <span style={{ fontSize: 26 }}>{m.icon}</span>
              <span style={{ flex: 1 }}>
                <span style={{ display: "block", fontWeight: 800, fontSize: 16 }}>
                  {m.title}
                </span>
                <span style={{ display: "block", color: "var(--muted)", fontSize: 13, marginTop: 2 }}>
                  {m.desc}
                </span>
              </span>
              <span style={{ color: "var(--faint)", fontSize: 18 }}>›</span>
            </Link>
          ))}
        </div>

        {/* (임시) 디자인 시안 보기 */}
        <Link
          href="/design"
          className="card"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            textDecoration: "none",
            color: "inherit",
            marginTop: 12,
            borderStyle: "dashed",
          }}
        >
          <span style={{ fontSize: 22 }}>🎨</span>
          <span style={{ flex: 1, fontWeight: 800, fontSize: 15 }}>디자인 시안 보기 (A/B/C 고르기)</span>
          <span style={{ color: "var(--faint)", fontSize: 18 }}>›</span>
        </Link>

        {/* 연결 상태 */}
        <div
          className={
            conn === "성공" ? "alert alert-ok" : conn === "실패" ? "alert alert-err" : "alert alert-info"
          }
          style={{ marginTop: 18, marginBottom: 0 }}
        >
          {conn === "확인중" && "데이터 창고에 연결하는 중…"}
          {conn === "성공" && "● 데이터 창고 연결됨"}
          {conn === "실패" && `연결 실패: ${errorMsg}`}
        </div>
      </main>
    </>
  );
}

function StatBox({ label, value, accent }: { label: string; value?: number; accent?: string }) {
  return (
    <div className="card" style={{ flex: 1, textAlign: "center", padding: "16px 0" }}>
      <div style={{ fontSize: 26, fontWeight: 800, color: accent ?? "var(--ink)" }}>
        {value ?? "—"}
      </div>
      <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{label}</div>
    </div>
  );
}

const menuCard: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 14,
  textDecoration: "none",
  color: "inherit",
};
