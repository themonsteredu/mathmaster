"use client";

export const STUDENT_KEY = "mm_student";

export function getStudent(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(STUDENT_KEY);
}
export function setStudent(name: string) {
  localStorage.setItem(STUDENT_KEY, name);
}
export function clearStudent() {
  localStorage.removeItem(STUDENT_KEY);
}
