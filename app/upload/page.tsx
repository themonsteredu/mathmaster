"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase, PHOTO_BUCKET } from "@/lib/supabase";
import { nextDue } from "@/lib/data";
import { PageHeader } from "@/components/ui";
import { IconCamera } from "@/components/icons";

function fileToBase64(file: File): Promise<{ data: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const s = r.result as string;
      resolve({ data: s.split(",")[1], mimeType: file.type || "image/jpeg" });
    };
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}
async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl);
  return res.blob();
}

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");

  // 낙서 지우기 관련
  const [cleaning, setCleaning] = useState(false);
  const [cleanedUrl, setCleanedUrl] = useState(""); // data URL (미리보기 + 업로드용)
  const [useCleaned, setUseCleaned] = useState(true);
  const [cleanError, setCleanError] = useState("");

  const [students, setStudents] = useState<string[]>([]);
  const [studentName, setStudentName] = useState("");
  const [typingName, setTypingName] = useState(false);

  const [subjects, setSubjects] = useState<string[]>([]);
  const [units, setUnits] = useState<string[]>([]);
  const [subject, setSubject] = useState("");
  const [unit, setUnit] = useState("");

  const [targetCount, setTargetCount] = useState(5);
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
    setCleanedUrl("");
    setCleanError("");
  }

  async function cleanScribbles() {
    if (!file) return;
    setCleaning(true);
    setCleanError("");
    try {
      const { data, mimeType } = await fileToBase64(file);
      const res = await fetch("/api/clean-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data, mimeType }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "처리 실패");
      setCleanedUrl(`data:${j.mimeType};base64,${j.image}`);
      setUseCleaned(true);
    } catch (e) {
      setCleanError(e instanceof Error ? e.message : "낙서 지우기에 실패했어요.");
    } finally {
      setCleaning(false);
    }
  }

  async function onSubmit() {
    setMessage(null);
    if (!file) return setMessage({ type: "err", text: "문제 사진을 먼저 선택해 주세요." });
    if (!studentName.trim()) return setMessage({ type: "err", text: "학생을 선택하거나 입력해 주세요." });

    setBusy(true);
    try {
      // 1) 원본은 항상 저장
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from(PHOTO_BUCKET).upload(path, file);
      if (upErr) throw new Error("사진 업로드 실패: " + upErr.message);
      const { data: pub } = supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path);

      // 2) 보정본을 쓰기로 했으면 따로 저장
      let cleanedUrlStored: string | null = null;
      if (cleanedUrl && useCleaned) {
        const blob = await dataUrlToBlob(cleanedUrl);
        const cpath = `cleaned/${crypto.randomUUID()}.png`;
        const { error: ce } = await supabase.storage.from(PHOTO_BUCKET).upload(cpath, blob, { contentType: "image/png" });
        if (ce) throw new Error("보정본 업로드 실패: " + ce.message);
        cleanedUrlStored = supabase.storage.from(PHOTO_BUCKET).getPublicUrl(cpath).data.publicUrl;
      }

      const base: Record<string, unknown> = {
        student_name: studentName.trim(),
        problem_image_url: pub.publicUrl,
        subject: subject.trim() || null,
        unit: unit.trim() || null,
        target_count: targetCount,
        uploaded_by: uploadedBy,
      };
      // 새 모델: 첫 출제 예정일을 잡고 '대기' 상태로 등록
      const full: Record<string, unknown> = {
        ...base,
        cleaned_image_url: cleanedUrlStored,
        attempts: 0,
        due_date: nextDue(0),
        status: "대기",
      };

      let { error: insErr } = await supabase.from("wrong_problems").insert(full);

      // 새 칸(보정본/스케줄)이 아직 없으면, 기본 정보만으로라도 등록
      if (insErr && /cleaned_image_url|attempts|due_date|column/.test(insErr.message || "")) {
        ({ error: insErr } = await supabase.from("wrong_problems").insert(base));
        if (!insErr) {
          setMessage({
            type: "ok",
            text: `등록은 됐어요! 다만 새 기능용 칸이 아직 없어 일부(보정본/출제 일정)는 저장되지 않았어요. Supabase에서 안내된 SQL을 실행하면 다음부터 모두 저장돼요.`,
          });
          setFile(null);
          setPreview("");
          setCleanedUrl("");
          return;
        }
      }
      if (insErr) throw new Error(insErr.message);

      setMessage({ type: "ok", text: `등록 완료! "${studentName.trim()}" 학생의 오답을 추가했어요. ${nextDue(0)}에 첫 출제 예정이에요.` });
      setFile(null);
      setPreview("");
      setCleanedUrl("");
    } catch (e) {
      const text =
        e instanceof Error ? e.message : typeof e === "object" && e && "message" in e ? String((e as { message: unknown }).message) : "알 수 없는 오류가 났어요.";
      setMessage({ type: "err", text: `등록 실패: ${text}` });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader eyebrow="학습" title="오답 등록" sub="틀린 문제를 사진으로 찍어 올리면 학습 목록에 추가됩니다." />

      <div className="card" style={{ padding: 24, maxWidth: 560 }}>
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

        {/* 낙서 지우기 */}
        {file && (
          <div style={{ marginTop: 12 }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={cleanScribbles} disabled={cleaning}>
              {cleaning ? "✨ 낙서 지우는 중… (10~20초)" : "✨ AI로 낙서 지우기"}
            </button>
            {cleanError && <div className="alert alert-err" style={{ marginTop: 10, marginBottom: 0 }}>❌ {cleanError}</div>}

            {cleanedUrl && (
              <div style={{ marginTop: 12 }}>
                <div className="row" style={{ gap: 10, alignItems: "stretch" }}>
                  <figure style={{ flex: 1, margin: 0 }}>
                    <figcaption className="muted" style={{ fontSize: 12, marginBottom: 4, fontWeight: 700 }}>원본</figcaption>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={preview} alt="원본" style={{ width: "100%", borderRadius: 10, border: "1px solid var(--line)" }} />
                  </figure>
                  <figure style={{ flex: 1, margin: 0 }}>
                    <figcaption style={{ fontSize: 12, marginBottom: 4, fontWeight: 700, color: "var(--done-ink)" }}>보정본 (낙서 제거)</figcaption>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={cleanedUrl} alt="보정본" style={{ width: "100%", borderRadius: 10, border: "2px solid var(--done-ink)" }} />
                  </figure>
                </div>
                <label className="row" style={{ gap: 8, marginTop: 10, cursor: "pointer", fontSize: 14, fontWeight: 600 }}>
                  <input type="checkbox" checked={useCleaned} onChange={(e) => setUseCleaned(e.target.checked)} />
                  보정본(낙서 지운 사진)을 사용하기
                </label>
                <p className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                  ※ 숫자·식이 바뀌지 않았는지 꼭 확인하세요. 원본은 항상 함께 보관됩니다.
                </p>
              </div>
            )}
          </div>
        )}

        <div className="field" style={{ marginTop: 20 }}>
          <label className="label">학생</label>
          {students.length > 0 && !typingName ? (
            <select
              className="select"
              value={studentName}
              onChange={(e) => {
                if (e.target.value === "__type__") { setTypingName(true); setStudentName(""); }
                else setStudentName(e.target.value);
              }}
            >
              <option value="">— 학생 선택 —</option>
              {students.map((s) => <option key={s} value={s}>{s}</option>)}
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
          <label className="label">최대 반복 횟수 (며칠 간격으로 최대 몇 번 출제할까요?)</label>
          <div className="stepper">
            <button type="button" className="step-btn" onClick={() => setTargetCount((n) => Math.max(1, n - 1))}>−</button>
            <span className="step-val">{targetCount}</span>
            <button type="button" className="step-btn" onClick={() => setTargetCount((n) => Math.min(5, n + 1))}>+</button>
            <span className="muted" style={{ fontSize: 13, marginLeft: 4 }}>회</span>
          </div>
          <p className="muted" style={{ fontSize: 12, marginTop: 6 }}>1→3→7→14→30일 간격으로 재출제하고, 끝까지 못 풀면 「경고 문항」으로 남겨요.</p>
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
