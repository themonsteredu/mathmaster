"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  BrandMark,
  IconDashboard,
  IconRegister,
  IconBox,
  IconStudent,
  IconTeacher,
  IconSettings,
  IconLogout,
  type IconType,
} from "@/components/icons";

type NavItem = { href: string; label: string; icon: IconType; count?: number };

export default function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "/";
  const router = useRouter();
  const [counts, setCounts] = useState<{ box: number; students: number }>({ box: 0, students: 0 });

  const role: "student" | "teacher" =
    pathname.startsWith("/admin") || pathname.startsWith("/students") ? "teacher" : "student";

  useEffect(() => {
    (async () => {
      const [{ count: box }, { count: students }] = await Promise.all([
        supabase.from("wrong_problems").select("id", { count: "exact", head: true }).eq("status", "학습중"),
        supabase.from("students").select("id", { count: "exact", head: true }),
      ]);
      setCounts({ box: box ?? 0, students: students ?? 0 });
    })();
  }, [pathname]);

  const studentNav: NavItem[] = [
    { href: "/", label: "홈", icon: IconDashboard },
    { href: "/upload", label: "오답 등록", icon: IconRegister },
    { href: "/box", label: "내 오답함", icon: IconBox, count: counts.box },
  ];
  const teacherNav: NavItem[] = [
    { href: "/admin", label: "대시보드", icon: IconDashboard },
    { href: "/students", label: "학생 관리", icon: IconStudent, count: counts.students },
  ];
  const nav = role === "teacher" ? teacherNav : studentNav;
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <div className="app-layout">
      {/* 사이드바 (데스크탑) */}
      <aside className="sidebar">
        <button className="brand" style={{ marginBottom: 22 }} onClick={() => router.push(role === "teacher" ? "/admin" : "/")}>
          <span className="brand-mark">
            <BrandMark size={16} />
          </span>
          <span>오답 반복학습</span>
        </button>

        <div className="side-section">{role === "teacher" ? "관리" : "학습"}</div>
        {nav.map((it) => {
          const Ic = it.icon;
          return (
            <button key={it.href} className={`nav-item ${isActive(it.href) ? "active" : ""}`} onClick={() => router.push(it.href)}>
              <Ic size={18} />
              <span>{it.label}</span>
              {it.count != null && <span className="count">{it.count}</span>}
            </button>
          );
        })}

        <div style={{ marginTop: "auto" }}>
          <div className="side-section">계정</div>
          <button className="nav-item" disabled style={{ opacity: 0.6, cursor: "default" }}>
            <IconSettings size={18} />
            <span>설정</span>
          </button>
          <button className="nav-item" disabled style={{ opacity: 0.6, cursor: "default" }}>
            <IconLogout size={18} />
            <span>로그아웃</span>
          </button>
        </div>
      </aside>

      <div className="main">
        {/* 상단 바 */}
        <header className="topbar">
          <div className="topbar-inner">
            <button className="brand" onClick={() => router.push(role === "teacher" ? "/admin" : "/")}>
              <span className="brand-mark">
                <BrandMark size={16} />
              </span>
              <span>오답 반복학습</span>
            </button>
            <span className="brand-sub">Mathmaster</span>
            <span className="topbar-spacer" />

            <div className="role-switch" role="tablist" aria-label="역할 전환">
              <button className={role === "student" ? "active" : ""} onClick={() => router.push("/")}>
                <IconStudent size={14} />
                <span className="rlabel">학생</span>
              </button>
              <button className={role === "teacher" ? "active" : ""} onClick={() => router.push("/admin")}>
                <IconTeacher size={14} />
                <span className="rlabel">선생님</span>
              </button>
            </div>
          </div>
        </header>

        <div className="content">{children}</div>
      </div>

      {/* 모바일 하단 탭 */}
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
