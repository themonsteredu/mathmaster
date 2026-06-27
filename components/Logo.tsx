// 학원 로고 (브라운 육각형 + 가운데 렌즈/눈). 배경 투명 → 프로그램 배경색에 자연스럽게 얹힘.
export function AcademyLogo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <polygon
        points="24,3 43,14 43,34 24,45 5,34 5,14"
        fill="#8a5a3a"
        stroke="#6f4528"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <circle cx="24" cy="24" r="11.5" fill="#3a2517" />
      <circle cx="24" cy="24" r="7.5" fill="#221610" />
      <circle cx="20.4" cy="20.4" r="2.4" fill="#f2e6d8" opacity="0.92" />
    </svg>
  );
}
