"use client";

import { useState } from "react";

// 학원 실제 로고 (themonster.kr). 사용자 브라우저가 직접 불러옴.
// 혹시 외부 로딩이 막히면 아래에 그린 몬스터로 자동 대체.
export function AcademyLogo({ size = 28 }: { size?: number }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
        <path d="M15 11 L18.5 3 L22 11 Z" fill="#f4692b" />
        <path d="M26 11 L29.5 3 L33 11 Z" fill="#f4692b" />
        <polygon points="24,7 40,15.5 40,32.5 24,41 8,32.5 8,15.5" fill="#f4692b" stroke="#dc551c" strokeWidth="1.4" strokeLinejoin="round" />
        <rect x="17.5" y="17.5" width="13" height="13" rx="4.5" fill="#28323b" />
        <circle cx="21" cy="21" r="2.2" fill="#ffffff" opacity="0.95" />
      </svg>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="https://www.themonster.kr/img/monster-symbol.png"
      alt="더몬스터 로고"
      width={size}
      height={size}
      onError={() => setFailed(true)}
      style={{ width: size, height: size, objectFit: "contain", display: "block" }}
    />
  );
}
