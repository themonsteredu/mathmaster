"use client";

import Link from "next/link";

/* ============================================================
   디자인 시안 비교 페이지 (임시)
   동일한 화면 조각을 3가지 톤으로 보여줍니다. (A / B / C)
   ============================================================ */

type Theme = {
  key: string;
  name: string;
  desc: string;
  bg: string;
  surface: string;
  ink: string;
  muted: string;
  border: string;
  brand: string;
  brandText: string;
  accent: string;
  studyBg: string;
  studyFg: string;
  doneBg: string;
  doneFg: string;
  track: string;
  radius: number;
  shadow: string;
};

const THEMES: Theme[] = [
  {
    key: "A",
    name: "시안 A — 토스 블루",
    desc: "흰 배경 + 강한 블루. 가장 토스에 가까운 깔끔·모던.",
    bg: "#f2f4f6",
    surface: "#ffffff",
    ink: "#191f28",
    muted: "#8b95a1",
    border: "#eaedf0",
    brand: "#3182f6",
    brandText: "#ffffff",
    accent: "#3182f6",
    studyBg: "#e8f3ff",
    studyFg: "#3182f6",
    doneBg: "#e7f9ef",
    doneFg: "#12b76a",
    track: "#eef1f4",
    radius: 18,
    shadow: "0 1px 3px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.04)",
  },
  {
    key: "B",
    name: "시안 B — 인디고 프리미엄",
    desc: "짙은 잉크 글자 + 인디고 포인트. 위계가 강한 고급 느낌.",
    bg: "#f5f5f7",
    surface: "#ffffff",
    ink: "#101012",
    muted: "#86868b",
    border: "#ececef",
    brand: "#4f46e5",
    brandText: "#ffffff",
    accent: "#6366f1",
    studyBg: "#eef0fe",
    studyFg: "#4f46e5",
    doneBg: "#e6f7ee",
    doneFg: "#059669",
    track: "#eeeef2",
    radius: 20,
    shadow: "0 1px 2px rgba(16,16,18,0.04), 0 10px 30px rgba(16,16,18,0.06)",
  },
  {
    key: "C",
    name: "시안 C — 프레시 민트",
    desc: "흰 배경 + 산뜻한 청록 포인트. 가볍고 경쾌하지만 정돈됨.",
    bg: "#f3f6f5",
    surface: "#ffffff",
    ink: "#16241f",
    muted: "#7c8a85",
    border: "#e6edea",
    brand: "#0ea5a0",
    brandText: "#ffffff",
    accent: "#10b981",
    studyBg: "#e3f6f4",
    studyFg: "#0e9488",
    doneBg: "#e7f8ee",
    doneFg: "#10b981",
    track: "#eaf1ef",
    radius: 18,
    shadow: "0 1px 3px rgba(0,0,0,0.04), 0 8px 22px rgba(0,0,0,0.05)",
  },
];

function Sample({ t }: { t: Theme }) {
  return (
    <div
      style={{
        background: t.bg,
        borderRadius: 22,
        padding: 16,
        border: `1px solid ${t.border}`,
      }}
    >
      {/* 상단 바 */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 4px 14px",
        }}
      >
        <span style={{ color: t.muted, fontSize: 18 }}>←</span>
        <span style={{ fontWeight: 800, color: t.ink, fontSize: 15 }}>오답 반복학습</span>
      </div>

      {/* 화면 제목 */}
      <div style={{ padding: "0 4px 14px" }}>
        <div style={{ fontSize: 24, fontWeight: 800, color: t.ink, letterSpacing: "-0.02em" }}>
          대시보드
        </div>
        <div style={{ fontSize: 14, color: t.muted, marginTop: 4 }}>
          오늘도 반복 학습으로 실력을 다져요.
        </div>
      </div>

      {/* 통계 카드 3개 */}
      <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
        {[
          { label: "학생", value: 12, color: t.ink },
          { label: "학습중", value: 7, color: t.studyFg },
          { label: "완료", value: 23, color: t.doneFg },
        ].map((s) => (
          <div
            key={s.label}
            style={{
              flex: 1,
              background: t.surface,
              borderRadius: t.radius,
              border: `1px solid ${t.border}`,
              boxShadow: t.shadow,
              padding: "18px 0",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 30, fontWeight: 800, color: s.color, letterSpacing: "-0.03em" }}>
              {s.value}
            </div>
            <div style={{ fontSize: 12, color: t.muted, marginTop: 4, fontWeight: 600 }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* 메뉴 행 2개 */}
      <div style={{ display: "grid", gap: 10, marginBottom: 14 }}>
        {[
          { icon: "📸", title: "오답 등록", desc: "틀린 문제 사진으로 올리기" },
          { icon: "📋", title: "학생 오답함", desc: "학습중인 문제 풀이 올리기" },
        ].map((m) => (
          <div
            key={m.title}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              background: t.surface,
              borderRadius: t.radius,
              border: `1px solid ${t.border}`,
              boxShadow: t.shadow,
              padding: 16,
            }}
          >
            <span style={{ fontSize: 24 }}>{m.icon}</span>
            <span style={{ flex: 1 }}>
              <span style={{ display: "block", fontWeight: 800, fontSize: 16, color: t.ink }}>
                {m.title}
              </span>
              <span style={{ display: "block", fontSize: 13, color: t.muted, marginTop: 2 }}>
                {m.desc}
              </span>
            </span>
            <span style={{ color: t.muted, fontSize: 18 }}>›</span>
          </div>
        ))}
      </div>

      {/* 오답 카드 */}
      <div
        style={{
          display: "flex",
          gap: 14,
          background: t.surface,
          borderRadius: t.radius,
          border: `1px solid ${t.border}`,
          boxShadow: t.shadow,
          padding: 16,
          marginBottom: 14,
        }}
      >
        <div
          style={{
            width: 76,
            height: 76,
            borderRadius: 14,
            background: `linear-gradient(135deg, ${t.track}, ${t.border})`,
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 26,
          }}
        >
          🧮
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 16, fontWeight: 800, color: t.ink }}>김민준</span>
            <span
              style={{
                fontSize: 12,
                fontWeight: 800,
                padding: "3px 10px",
                borderRadius: 999,
                background: t.studyBg,
                color: t.studyFg,
              }}
            >
              학습중
            </span>
          </div>
          <div style={{ fontSize: 13, color: t.muted, marginTop: 3 }}>수학 · 이차방정식</div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12 }}>
            <div style={{ flex: 1, height: 10, background: t.track, borderRadius: 999, overflow: "hidden" }}>
              <div style={{ width: "33%", height: "100%", background: t.accent, borderRadius: 999 }} />
            </div>
            <span style={{ fontSize: 13, fontWeight: 800, color: t.accent, whiteSpace: "nowrap" }}>
              1/3회
            </span>
          </div>
        </div>
      </div>

      {/* 기본 버튼 */}
      <button
        style={{
          width: "100%",
          padding: "16px",
          borderRadius: 14,
          border: "none",
          background: t.brand,
          color: t.brandText,
          fontSize: 16,
          fontWeight: 800,
          cursor: "pointer",
        }}
      >
        ✏️ 풀이 올리기
      </button>
    </div>
  );
}

export default function DesignPage() {
  return (
    <main style={{ background: "#0b1220", minHeight: "100vh", padding: "28px 16px 80px" }}>
      <div style={{ maxWidth: 460, margin: "0 auto" }}>
        <Link href="/" style={{ color: "#94a3b8", fontSize: 14, fontWeight: 600, textDecoration: "none" }}>
          ← 홈으로
        </Link>
        <h1 style={{ color: "#fff", fontSize: 24, fontWeight: 800, marginTop: 12 }}>
          🎨 디자인 시안 비교
        </h1>
        <p style={{ color: "#94a3b8", fontSize: 14, marginTop: 6, lineHeight: 1.6 }}>
          아래 3개를 비교해보고 마음에 드는 시안의 <b style={{ color: "#fff" }}>알파벳(A/B/C)</b>을
          알려주세요. 고른 톤을 앱 전체에 적용할게요.
        </p>

        <div style={{ display: "grid", gap: 26, marginTop: 24 }}>
          {THEMES.map((t) => (
            <div key={t.key}>
              <div style={{ marginBottom: 10 }}>
                <div style={{ color: "#fff", fontSize: 17, fontWeight: 800 }}>{t.name}</div>
                <div style={{ color: "#94a3b8", fontSize: 13, marginTop: 3 }}>{t.desc}</div>
              </div>
              <Sample t={t} />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
