// 학원 로고 (주황 육각형 몬스터 + 뿔 2개 + 가운데 눈). 배경 투명 → 프로그램 배경색에 자연스럽게 얹힘.
export function AcademyLogo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
      {/* 뿔(귀) 2개 */}
      <path d="M15 11 L18.5 3 L22 11 Z" fill="#f4692b" />
      <path d="M26 11 L29.5 3 L33 11 Z" fill="#f4692b" />
      {/* 몸통 육각형 */}
      <polygon
        points="24,7 40,15.5 40,32.5 24,41 8,32.5 8,15.5"
        fill="#f4692b"
        stroke="#dc551c"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      {/* 눈 */}
      <rect x="17.5" y="17.5" width="13" height="13" rx="4.5" fill="#28323b" />
      <circle cx="21" cy="21" r="2.2" fill="#ffffff" opacity="0.95" />
    </svg>
  );
}
