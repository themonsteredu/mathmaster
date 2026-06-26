"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppBar from "@/components/AppBar";
import { supabase, PHOTO_BUCKET } from "@/lib/supabase";

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");

  const [students, setStudents] = useState<string[]>([]);
  const [studentName, setStudentName] = useState("");
  const [typingName, setTypingName] = useState(false); // 직접 입력 모드

  const [subjects, setSubjects] = useState<string[]>([]);
  const [units, setUnits] = useState<string[]>([]);
  const [subject, setSubject] = useState("");
  const [unit, setUnit] = useState("");

  const [targetCount, setTargetCount] = useState(3);
  const [uploadedBy, setUploadedBy] = useState("선생님");

  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // 등록된 학생 + 이전에 쓴 과목/단원 불러오기 (자동완성용)
  useEffect(() => {
    supabase
      .from("students")
      .select("name")
      .order("name")
      .then(({ data }) => setStudents((data ?? []).map((s) => s.name)));

    supabase
      .from("wrong_problems")
      .select("subject, unit")
      .then(({ data }) => {
        const subs = new Set<string>();
        const uns = new Set<string>();
        (data ?? []).forEach((r) => {
          if (r.subject) subs.add(r.subject);
          if (r.unit) uns.add(r.unit);
        });
        setSubjects([...subs]);
        setUnits([...uns]);
      });
  }, []);

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setPreview(f ? URL.createObjectURL(f) : "");
  }

  async function onSubmit() {
    setMessage(null);
    if (!file) return setMessage({ type: "err", text: "문제 사진을 먼저 선택해 주세요." });
    if (!studentName.trim()) return setMessage({ type: "err", text: "학생을 선택하거나 입력해 주세요." });

    setBusy(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from(PHOTO_BUCKET).upload(path, file);
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path);

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
    <>
      <AppBar />
      <main className="container">
        <h1 className="page-title">오답 등록</h1>
        <p className="page-sub">틀린 문제를 사진으로 찍어 등록하세요.</p>

        <div className="card">
          {/* 사진 */}
          <span className="label">문제 사진 *</span>
          <label style={fileBox}>
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="미리보기" style={previewImg} />
            ) : (
              <span style={{ color: "var(--faint)", fontSize: 14 }}>
                여기를 눌러 사진 촬영 / 선택
              </span>
            )}
            <input type="file" accept="image/*" onChange={onPickFile} style={{ display: "none" }} />
          </label>

          {/* 학생 선택 */}
          <div className="field">
            <span className="label">학생 *</span>
            {students.length > 0 && !typingName ? (
              <select
                className="select"
                value={studentName}
                onChange={(e) => {
                  if (e.target.value === "__type__") {
                    setTypingName(true);
                    setStudentName("");
                  } else {
                    setStudentName(e.target.value);
                  }
                }}
              >
                <option value="">— 학생 선택 —</option>
                {students.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
                <option value="__type__">✏️ 직접 입력…</option>
              </select>
            ) : (
              <input
                className="input"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="학생 이름 입력 (예: 김민준)"
              />
            )}
            {students.length === 0 && (
              <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>
                💡 <Link href="/students" style={{ color: "var(--study-fg)", fontWeight: 700 }}>학생 관리</Link>
                에서 명단을 등록하면 목록에서 골라 쓸 수 있어요.
              </p>
            )}
            {typingName && students.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setTypingName(false);
                  setStudentName("");
                }}
                style={{ ...linkBtn, marginTop: 6 }}
              >
                ← 목록에서 선택
              </button>
            )}
          </div>

          {/* 과목 / 단원 (자동완성) */}
          <div style={{ display: "flex", gap: 10 }}>
            <div className="field" style={{ flex: 1 }}>
              <span className="label">과목</span>
              <input
                className="input"
                list="subject-list"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="예: 수학"
              />
              <datalist id="subject-list">
                {subjects.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </div>
            <div className="field" style={{ flex: 1 }}>
              <span className="label">단원</span>
              <input
                className="input"
                list="unit-list"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="예: 이차방정식"
              />
              <datalist id="unit-list">
                {units.map((u) => (
                  <option key={u} value={u} />
                ))}
              </datalist>
            </div>
          </div>

          {/* 목표 횟수 */}
          <div className="field">
            <span className="label">목표 횟수 (몇 번 반복해서 풀까요?)</span>
            <div className="stepper">
              <button type="button" className="step-btn" onClick={() => setTargetCount((n) => Math.max(1, n - 1))}>
                −
              </button>
              <span className="step-val">{targetCount}</span>
              <button type="button" className="step-btn" onClick={() => setTargetCount((n) => Math.min(20, n + 1))}>
                +
              </button>
              <span style={{ color: "var(--faint)", fontSize: 13, marginLeft: 4 }}>회</span>
            </div>
          </div>

          {/* 올린 사람 */}
          <div className="field">
            <span className="label">올린 사람</span>
            <div style={{ display: "flex", gap: 8 }}>
              {["선생님", "학생"].map((who) => (
                <button
                  key={who}
                  type="button"
                  onClick={() => setUploadedBy(who)}
                  className={uploadedBy === who ? "chip chip-on" : "chip"}
                  style={{ flex: 1, padding: "11px 0" }}
                >
                  {who}
                </button>
              ))}
            </div>
          </div>

          <button className="btn btn-primary btn-block" style={{ marginTop: 22 }} onClick={onSubmit} disabled={busy}>
            {busy ? "올리는 중…" : "오답 등록하기"}
          </button>

          {message && (
            <div className={message.type === "ok" ? "alert alert-ok" : "alert alert-err"} style={{ marginTop: 16, marginBottom: 0 }}>
              {message.type === "ok" ? "✅ " : "❌ "}
              {message.text}
            </div>
          )}
        </div>
      </main>
    </>
  );
}

const fileBox: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 160,
  border: "2px dashed var(--border)",
  borderRadius: 14,
  cursor: "pointer",
  overflow: "hidden",
  background: "#f8fafc",
};
const previewImg: React.CSSProperties = { width: "100%", maxHeight: 280, objectFit: "contain" };
const linkBtn: React.CSSProperties = {
  background: "none",
  border: "none",
  color: "var(--study-fg)",
  fontWeight: 700,
  fontSize: 13,
  cursor: "pointer",
  padding: 0,
};
