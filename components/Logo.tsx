// 학원 실제 로고 (themonster.kr). 사용자 브라우저가 직접 불러오므로 화질 그대로.
// 배경 투명 PNG라 프로그램 배경색에 자연스럽게 얹힘.
export function AcademyLogo({ size = 28 }: { size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="https://www.themonster.kr/img/monster-symbol.png"
      alt="더몬스터 로고"
      width={size}
      height={size}
      style={{ width: size, height: size, objectFit: "contain", display: "block" }}
    />
  );
}
