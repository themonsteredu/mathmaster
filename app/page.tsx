"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function Home() {
  const [status, setStatus] = useState<"확인중" | "성공" | "실패">("확인중");
  const [count, setCount] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>("");

  useEffect(() => {
    // 창고(Supabase)에 연결해서 오답문제 개수를 세어 본다 → 연결 확인용
    supabase
      .from("wrong_problems")
      .select("*", { count: "exact", head: true })
      .then(({ count, error }) => {
        if (error) {
          setStatus("실패");
          setErrorMsg(error.message);
        } else {
          setStatus("성공");
          setCount(count ?? 0);
        }
      });
  }, []);

  const box =
    status === "성공"
      ? { bg: "#ecfdf5", color: "#047857" }
      : status === "실패"
        ? { bg: "#fef2f2", color: "#b91c1c" }
        : { bg: "#eef2ff", color: "#4338ca" };

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        textAlign: "center",
      }}
    >
      <div
        style={{
          background: "#ffffff",
          borderRadius: "20px",
          padding: "48px 32px",
          maxWidth: "440px",
          width: "100%",
          boxShadow: "0 10px 30px rgba(0,0,0,0.06)",
        }}
      >
        <div style={{ fontSize: "48px", marginBottom: "16px" }}>📐</div>
        <h1 style={{ fontSize: "26px", fontWeight: 800, marginBottom: "12px" }}>
          오답 반복학습
        </h1>
        <p style={{ fontSize: "15px", color: "#6b7280", lineHeight: 1.6 }}>
          틀린 문제를 사진으로 올리고,
          <br />
          정한 횟수만큼 반복해서 푸는 학습 앱이에요.
        </p>

        <Link
          href="/upload"
          style={{
            display: "block",
            marginTop: "24px",
            padding: "16px",
            background: "#4338ca",
            color: "#fff",
            borderRadius: "14px",
            fontSize: "16px",
            fontWeight: 800,
            textDecoration: "none",
          }}
        >
          📸 오답 문제 올리기
        </Link>

        <Link
          href="/box"
          style={{
            display: "block",
            marginTop: "12px",
            padding: "16px",
            background: "#eef2ff",
            color: "#4338ca",
            borderRadius: "14px",
            fontSize: "16px",
            fontWeight: 800,
            textDecoration: "none",
          }}
        >
          📋 학생 오답함 보기
        </Link>

        <div
          style={{
            marginTop: "28px",
            padding: "14px 16px",
            background: box.bg,
            color: box.color,
            borderRadius: "12px",
            fontSize: "14px",
            fontWeight: 600,
            lineHeight: 1.5,
          }}
        >
          {status === "확인중" && "⏳ 데이터 창고에 연결하는 중..."}
          {status === "성공" && (
            <>
              ✅ 1단계 완료 — 데이터 창고 연결 성공!
              <br />
              현재 등록된 오답문제: {count}개
            </>
          )}
          {status === "실패" && (
            <>
              ❌ 창고 연결 실패
              <br />
              <span style={{ fontSize: "12px", fontWeight: 400 }}>
                {errorMsg}
              </span>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
