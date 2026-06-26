"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase, PHOTO_BUCKET } from "@/lib/supabase";

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>("");
  const [studentName, setStudentName] = useState("");
  const [subject, setSubject] = useState("");
  const [unit, setUnit] = useState("");
  const [targetCount, setTargetCount] = useState(3);
  const [uploadedBy, setUploadedBy] = useState("선생님");

  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(
    null,
  );

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setPreview(f ? URL.createObjectURL(f) : "");
  }

  async function onSubmit() {
    setMessage(null);

    if (!file) {
      setMessage({ type: "err", text: "문제 사진을 먼저 선택해 주세요." });
      return;
    }
    if (!studentName.trim()) {
      setMessage({ type: "err", text: "학생 이름을 입력해 주세요." });
      return;
    }

    setBusy(true);
    try {
      // 1) 사진을 보관함(Storage)에 올린다
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from(PHOTO_BUCKET)
        .upload(path, file);
      if (upErr) throw upErr;

      // 2) 올린 사진의 공개 주소를 가져온다
      const { data: pub } = supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path);

      // 3) 오답문제 표에 한 줄 추가한다
      const { error: insErr } = await supabase.from("wrong_problems").insert({
        student_name: studentName.trim(),
        problem_image_url: pub.publicUrl,
        subject: subject.trim() || null,
        unit: unit.trim() || null,
        target_count: targetCount,
        uploaded_by: uploadedBy,
      });
      if (insErr) throw insErr;

      setMessage({
        type: "ok",
        text: `등록 완료! "${studentName.trim()}" 학생의 오답이 ${targetCount}회 목표로 추가됐어요.`,
      });
      // 입력값 초기화 (이름/과목/단원은 다음 문제 등록 편의를 위해 유지)
      setFile(null);
      setPreview("");
    } catch (e) {
      const text = e instanceof Error ? e.message : "알 수 없는 오류가 났어요.";
      setMessage({ type: "err", text: `등록 실패: ${text}` });
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={S.page}>
      <div style={S.card}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Link href="/" style={S.back}>
            ← 홈
          </Link>
        </div>
        <h1 style={S.title}>📸 오답 문제 올리기</h1>
        <p style={S.sub}>틀린 문제를 사진으로 찍어 등록하세요.</p>

        {/* 사진 선택 */}
        <label style={S.label}>문제 사진 *</label>
        <label style={S.fileBox}>
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="미리보기" style={S.previewImg} />
          ) : (
            <span style={{ color: "#9ca3af" }}>여기를 눌러 사진 촬영 / 선택</span>
          )}
          <input
            type="file"
            accept="image/*"
            onChange={onPickFile}
            style={{ display: "none" }}
          />
        </label>

        {/* 학생 이름 */}
        <label style={S.label}>학생 이름 *</label>
        <input
          style={S.input}
          value={studentName}
          onChange={(e) => setStudentName(e.target.value)}
          placeholder="예: 김민준"
        />

        {/* 과목 / 단원 */}
        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ flex: 1 }}>
            <label style={S.label}>과목</label>
            <input
              style={S.input}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="예: 수학"
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={S.label}>단원</label>
            <input
              style={S.input}
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="예: 일차방정식"
            />
          </div>
        </div>

        {/* 목표 횟수 */}
        <label style={S.label}>목표 횟수 (몇 번 반복해서 풀까요?)</label>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            type="button"
            style={S.stepBtn}
            onClick={() => setTargetCount((n) => Math.max(1, n - 1))}
          >
            −
          </button>
          <span style={{ fontSize: 22, fontWeight: 800, minWidth: 40, textAlign: "center" }}>
            {targetCount}
          </span>
          <button
            type="button"
            style={S.stepBtn}
            onClick={() => setTargetCount((n) => Math.min(20, n + 1))}
          >
            +
          </button>
          <span style={{ color: "#9ca3af", fontSize: 13 }}>회</span>
        </div>

        {/* 올린 사람 */}
        <label style={S.label}>올린 사람</label>
        <div style={{ display: "flex", gap: 10 }}>
          {["선생님", "학생"].map((who) => (
            <button
              key={who}
              type="button"
              onClick={() => setUploadedBy(who)}
              style={{
                ...S.chip,
                ...(uploadedBy === who ? S.chipOn : {}),
              }}
            >
              {who}
            </button>
          ))}
        </div>

        {/* 등록 버튼 */}
        <button style={S.submit} onClick={onSubmit} disabled={busy}>
          {busy ? "올리는 중..." : "오답 등록하기"}
        </button>

        {message && (
          <div
            style={{
              ...S.msg,
              background: message.type === "ok" ? "#ecfdf5" : "#fef2f2",
              color: message.type === "ok" ? "#047857" : "#b91c1c",
            }}
          >
            {message.type === "ok" ? "✅ " : "❌ "}
            {message.text}
          </div>
        )}
      </div>
    </main>
  );
}

const S: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    padding: "24px 16px",
  },
  card: {
    background: "#fff",
    borderRadius: 20,
    padding: 24,
    maxWidth: 460,
    width: "100%",
    boxShadow: "0 10px 30px rgba(0,0,0,0.06)",
  },
  back: { color: "#6b7280", textDecoration: "none", fontSize: 14, fontWeight: 600 },
  title: { fontSize: 22, fontWeight: 800, margin: "10px 0 4px" },
  sub: { fontSize: 14, color: "#6b7280", marginBottom: 18 },
  label: { display: "block", fontSize: 13, fontWeight: 700, color: "#374151", margin: "16px 0 6px" },
  input: {
    width: "100%",
    padding: "12px 14px",
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    fontSize: 16,
    outline: "none",
  },
  fileBox: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 160,
    border: "2px dashed #d1d5db",
    borderRadius: 14,
    cursor: "pointer",
    overflow: "hidden",
    background: "#fafafa",
  },
  previewImg: { width: "100%", maxHeight: 280, objectFit: "contain" },
  stepBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    border: "1px solid #e5e7eb",
    background: "#f9fafb",
    fontSize: 22,
    fontWeight: 700,
    cursor: "pointer",
  },
  chip: {
    flex: 1,
    padding: "12px 0",
    borderRadius: 12,
    border: "1px solid #e5e7eb",
    background: "#fff",
    fontSize: 15,
    fontWeight: 700,
    color: "#6b7280",
    cursor: "pointer",
  },
  chipOn: { background: "#4338ca", color: "#fff", borderColor: "#4338ca" },
  submit: {
    width: "100%",
    marginTop: 24,
    padding: "16px",
    borderRadius: 14,
    border: "none",
    background: "#4338ca",
    color: "#fff",
    fontSize: 17,
    fontWeight: 800,
    cursor: "pointer",
  },
  msg: { marginTop: 16, padding: "14px 16px", borderRadius: 12, fontSize: 14, fontWeight: 600, lineHeight: 1.5 },
};
