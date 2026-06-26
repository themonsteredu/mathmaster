export default function Home() {
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
        <div
          style={{
            marginTop: "28px",
            padding: "12px 16px",
            background: "#eef2ff",
            color: "#4338ca",
            borderRadius: "12px",
            fontSize: "14px",
            fontWeight: 600,
          }}
        >
          ✅ 0단계 완료 — 앱이 정상적으로 켜졌어요!
        </div>
      </div>
    </main>
  );
}
