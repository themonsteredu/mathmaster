"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { todayISO } from "@/lib/data";
import {
  IconDashboard,
  IconRegister,
  IconBook,
  IconBox,
  IconStudent,
  IconStats,
  IconLogout,
  type IconType,
} from "@/components/icons";
import { AcademyLogo } from "@/components/Logo";

type NavItem = { href: string; label: string; icon: IconType; count?: number };

export default function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "/";
  const router = useRouter();
  const [counts, setCounts] = useState<{ due: number; students: number }>({ due: 0, students: 0 });
  const [studentName, setStudentName] = useState<string | null>(null);

  const isStudent = pathname.startsWith("/student");

  useEffect(() => {
    if (typeof window !== "undefined") setStudentName(localStorage.getItem("mm_student"));
  }, [pathname]);

  useEffect(() => {
    (async () => {
      const today = todayISO();
      const [{ data: probs }, { count: students }] = await Promise.all([
        supabase.from("wrong_problems").select("status, due_date"),
        supabase.from("students").select("id", { count: "exact", head: true }),
      ]);
      const due = (probs ?? []).filter(
        (p) => p.status !== "완료" && p.status !== "경고" && (!p.due_date || p.due_date <= today),
      ).length;
      setCounts({ due, students: students ?? 0 });
    })();
  }, [pathname]);

  if (isStudent) {
    return (
      <div className="main">
        <header className="topbar">
          <div className="topbar-inner">
            <span className="brand">
              <span className="brand-mark"><AcademyLogo size={24} /></span>
              <span style={{ color: "var(--ink)" }}>오답Master</span>
            </span>
            <span className="topbar-spacer" />
            {studentName && (
              <>
                <span style={{ fontWeight: 700, fontSize: 14 }}>{studentName}</span>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => { localStorage.removeItem("mm_student"); router.push("/student"); }}
                >
                  로그아웃
                </button>
              </>
            )}
          </div>
        </header>
        <div className="content" style={{ maxWidth: 560 }}>{children}</div>
      </div>
    );
  }

  const nav: NavItem[] = [
    { href: "/admin", label: "대시보드", icon: IconDashboard },
    { href: "/gallery", label: "문항 보기", icon: IconBox },
    { href: "/upload", label: "오답 등록", icon: IconRegister },
    { href: "/worksheet", label: "시험지 만들기", icon: IconBook, count: counts.due },
    { href: "/report", label: "리포트", icon: IconStats },
    { href: "/students", label: "학생 관리", icon: IconStudent, count: counts.students },
  ];
  const isActive = (href: string) =>
    href === "/admin" ? pathname === "/" || pathname.startsWith("/admin") : pathname.startsWith(href);

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <button className="brand" style={{ marginBottom: 22 }} onClick={() => router.push("/admin")}>
          <span className="brand-mark"><AcademyLogo size={24} /></span>
          <span style={{ color: "var(--ink)" }}>오답Master</span>
        </button>

        <div className="side-section">관리</div>
        {nav.map((it) => {
          const Ic = it.icon;
          return (
            <button key={it.href} className={`nav-item ${isActive(it.href) ? "active" : ""}`} onClick={() => router.push(it.href)}>
              <Ic size={18} />
              <span>{it.label}</span>
              {it.count != null && it.count > 0 && <span className="count">{it.count}</span>}
            </button>
          );
        })}

        <div style={{ marginTop: "auto" }}>
          <div className="side-section">계정</div>
          <button className={`nav-item ${pathname.startsWith("/usage") ? "active" : ""}`} onClick={() => router.push("/usage")}><IconStats size={18} /><span>API 사용량</span></button>
          <button className="nav-item" disabled style={{ opacity: 0.6, cursor: "default" }}><IconLogout size={18} /><span>로그아웃</span></button>
        </div>
      </aside>

      <div className="main">
        <div className="content">{children}</div>
      </div>

      <nav className="mobile-nav">
        {nav.map((it) => {
          const Ic = it.icon;
          return (
            <button key={it.href} className={isActive(it.href) ? "active" : ""} onClick={() => router.push(it.href)}>
              <Ic size={20} />
              <span>{it.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
