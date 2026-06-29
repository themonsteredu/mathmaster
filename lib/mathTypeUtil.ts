// 유형표(MATH_TYPES) 사용 도우미 — 학년·학기 선택, 코드 앞자리, 필터링 등
import { MATH_TYPES, type MathType } from "./mathTypes";

export const GRADES = ["초3", "초4", "초5", "초6"];
export const TERMS = ["1학기", "2학기"];

// "초4" + "2학기" → "4-2" (유형코드 앞자리)
export function codePrefix(grade: string, term: string): string {
  return `${grade.replace("초", "")}-${term.replace("학기", "")}`;
}

// 해당 학년·학기 유형만 (선행이면 학생 학년과 달라도 됨 — 선택값 기준)
export function typesFor(grade: string, term: string): MathType[] {
  return MATH_TYPES.filter((t) => t.grade === grade && t.term === term);
}

// 코드 → 유형 1건
export function typeByCode(code: string): MathType | undefined {
  return MATH_TYPES.find((t) => t.code === code);
}

// 학년·학기를 코드에서 거꾸로 (예: "4-2-1-03" → {grade:"초4", term:"2학기"})
export function gradeTermOfCode(code: string): { grade: string; term: string } | null {
  const m = code.match(/^(\d)-(\d)-/);
  if (!m) return null;
  return { grade: `초${m[1]}`, term: `${m[2]}학기` };
}
