"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase, PHOTO_BUCKET } from "@/lib/supabase";
import { PageHeader } from "@/components/ui";
import { IconCamera } from "@/components/icons";

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");

  const [students, setStudents] = useState<string[]>([]);
  const [studentName, setStudentName] = useState("");
  const [typingName, setTypingName] = useState(false);

  const [subjects, setSubjects] = useState<string[]>([]);
  const [units, setUnits] = useState<string[]>([]);
  const [subject, setSubject] = useState("");
  const [unit, setUnit] = useState("");

  const [targetCount, setTargetCount] = useState(3);
  const [uploadedBy, setUploadedBy] = useState("선생님");

  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

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

      setMessage({ type: "ok", text: `등록 완료! "${studentName.trim()}" 학생의 오답이 ${targetCount}회 목표로 추가됐어요.` });
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
      <PageHeader eyebrow="학습" title="오답 등록" sub="틀린 문제를 사진으로 찍어 올리면 학습 목록에 추가됩니다." />

      <div className="card" style={{ padding: 24, maxWidth: 520 }}>
        <span className="label">문제 사진</span>
        <label className="upload-area" style={{ width: "100%", padding: 0, overflow: "hidden" }}>
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="미리보기" style={{ width: "100%", maxHeight: 280, objectFit: "contain" }} />
          ) : (
            <>
              <span style={{ color: "var(--muted)", marginBottom: 8 }}><IconCamera size={34} /></span>
              <span style={{ fontWeight: 700, fontSize: 15 }}>사진 찍기 또는 파일 선택</span>
              <span className="muted" style={{ fontSize: 13, marginTop: 4 }}>문제가 잘 보이게 찍어주세요</span>
            </>
          )}
          <input type="file" accept="image/*" onChange={onPickFile} style={{ display: "none" }} />
        </label>

        <div className="field" style={{ marginTop: 20 }}>
          <label className="label">학생</label>
          {students.length > 0 && !typingName ? (
            <select
              className="select"
              value={studentName}
              onChange={(e) => {
                if (e.target.value === "__type__") {
                  setTypingName(true);
                  setStudentName("");
                } else setStudentName(e.target.value);
              }}
            >
              <option value="">— 학생 선택 —</option>
              {students.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
              <option value="__type__">✏️ 직접 입력…</option>
            </select>
          ) : (
            <input className="input" value={studentName} onChange={(e) => setStudentName(e.target.value)} placeholder="학생 이름 입력 (예: 김민준)" />
          )}
          {students.length === 0 && (
            <p className="muted" style={{ fontSize: 12, marginTop: 6 }}>
              💡 <Link href="/students" style={{ color: "var(--accent-ink)", fontWeight: 700 }}>학생 관리</Link>에서 명단을 등록하면 골라 쓸 수 있어요.
            </p>
          )}
          {typingName && students.length > 0 && (
            <button type="button" className="btn btn-ghost btn-sm" style={{ marginTop: 6, paddingLeft: 0 }} onClick={() => { setTypingName(false); setStudentName(""); }}>
              ← 목록에서 선택
            </button>
          )}
        </div>

        <div className="row" style={{ gap: 12, alignItems: "flex-start" }}>
          <div className="field" style={{ flex: 1, marginBottom: 0 }}>
            <label className="label">과목</label>
            <input className="input" list="subject-list" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="예: 수학" />
            <datalist id="subject-list">{subjects.map((s) => <option key={s} value={s} />)}</datalist>
          </div>
          <div className="field" style={{ flex: 1, marginBottom: 0 }}>
            <label className="label">단원</label>
            <input className="input" list="unit-list" value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="예: 이차방정식" />
            <datalist id="unit-list">{units.map((u) => <option key={u} value={u} />)}</datalist>
          </div>
        </div>

        <div className="field" style={{ marginTop: 16 }}>
          <label className="label">목표 횟수 (몇 번 반복해서 풀까요?)</label>
          <div className="stepper">
            <button type="button" className="step-btn" onClick={() => setTargetCount((n) => Math.max(1, n - 1))}>−</button>
            <span className="step-val">{targetCount}</span>
            <button type="button" className="step-btn" onClick={() => setTargetCount((n) => Math.min(20, n + 1))}>+</button>
            <span className="muted" style={{ fontSize: 13, marginLeft: 4 }}>회</span>
          </div>
        </div>

        <div className="field">
          <label className="label">올린 사람</label>
          <div className="row" style={{ gap: 8 }}>
            {["선생님", "학생"].map((who) => (
              <button key={who} type="button" className={`btn ${uploadedBy === who ? "btn-primary" : "btn-secondary"}`} style={{ flex: 1 }} onClick={() => setUploadedBy(who)}>
                {who}
              </button>
            ))}
          </div>
        </div>

        <button className="btn btn-primary btn-lg btn-block" style={{ marginTop: 12 }} onClick={onSubmit} disabled={busy}>
          {busy ? "올리는 중…" : "오답 등록하기"}
        </button>

        {message && <div className={`alert ${message.type === "ok" ? "alert-ok" : "alert-err"}`} style={{ marginTop: 16, marginBottom: 0 }}>{message.type === "ok" ? "✅ " : "❌ "}{message.text}</div>}
      </div>
    </>
  );
}
