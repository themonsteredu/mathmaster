"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { supabase, PHOTO_BUCKET } from "@/lib/supabase";
import { nextDue } from "@/lib/data";
import { PageHeader } from "@/components/ui";
import { IconCamera } from "@/components/icons";

type Item = {
  id: string;
  file: File;
  previewUrl: string;
  answer: string;
  unit: string;
  detecting: boolean;
  cleanedDataUrl?: string;
  useCleaned: boolean;
  cleaning: boolean;
  cleanError?: string;
};

function fileToBase64(file: File): Promise<{ data: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve({ data: (r.result as string).split(",")[1], mimeType: file.type || "image/jpeg" });
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}
async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  return (await fetch(dataUrl)).blob();
}

const SYMS = ["√", "²", "³", "½", "⅓", "¼", "π", "±", "×", "÷", "≤", "≥", "≠", "°", "∠", "/"];

export default function UploadPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [students, setStudents] = useState<string[]>([]);
  const [studentName, setStudentName] = useState("");
  const [typingName, setTypingName] = useState(false);
  const [targetCount, setTargetCount] = useState(5);
  const [focusedAnswerId, setFocusedAnswerId] = useState<string | null>(null);
  const [cropId, setCropId] = useState<string | null>(null);
  const [pageSrc, setPageSrc] = useState<string | null>(null);

  function onPickPage(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) setPageSrc(URL.createObjectURL(f));
    e.target.value = "";
  }
  async function addCrop(dataUrl: string) {
    const blob = await dataUrlToBlob(dataUrl);
    const file = new File([blob], `crop-${crypto.randomUUID()}.png`, { type: "image/png" });
    setItems((prev) => [
      ...prev,
      { id: crypto.randomUUID(), file, previewUrl: dataUrl, answer: "", unit: "", detecting: false, useCleaned: false, cleaning: false },
    ]);
  }

  function insertSymbol(sym: string) {
    if (!focusedAnswerId) return;
    setItems((prev) => prev.map((i) => (i.id === focusedAnswerId ? { ...i, answer: i.answer + sym } : i)));
  }

  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    supabase.from("students").select("name").order("name").then(({ data }) => setStudents((data ?? []).map((s) => s.name)));
  }, []);

  function onPickFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    const next = files.map((f) => ({ id: crypto.randomUUID(), file: f, previewUrl: URL.createObjectURL(f), answer: "", unit: "", detecting: false, useCleaned: true, cleaning: false }));
    setItems((prev) => [...prev, ...next]);
    e.target.value = "";
  }

  function removeItem(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }
  function patch(id: string, p: Partial<Item>) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...p } : i)));
  }

  async function cleanOne(it: Item) {
    patch(it.id, { cleaning: true, cleanError: undefined });
    try {
      const { data, mimeType } = await fileToBase64(it.file);
      const res = await fetch("/api/clean-image", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ data, mimeType }) });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "처리 실패");
      patch(it.id, { cleanedDataUrl: `data:${j.mimeType};base64,${j.image}`, useCleaned: true });
    } catch (e) {
      patch(it.id, { cleanError: e instanceof Error ? e.message : "낙서 지우기 실패" });
    } finally {
      patch(it.id, { cleaning: false });
    }
  }

  async function cleanAll() {
    for (const it of items) if (!it.cleanedDataUrl) await cleanOne(it);
  }

  // 무료 정리는 '잘라내기(크롭)'로 처리 — 아래 CropModal에서 영역을 잘라 cleanedDataUrl로 저장

  async function detectUnit(it: Item) {
    patch(it.id, { detecting: true });
    try {
      const { data, mimeType } = await fileToBase64(it.file);
      const res = await fetch("/api/detect-unit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ data, mimeType }) });
      const j = await res.json();
      if (res.ok && j.unit) patch(it.id, { unit: j.unit });
    } catch {
      /* 무시 — 수동 입력 가능 */
    } finally {
      patch(it.id, { detecting: false });
    }
  }
  async function detectAllUnits() {
    for (const it of items) if (!it.unit) await detectUnit(it);
  }

  async function submitAll() {
    setMessage(null);
    if (items.length === 0) return setMessage({ type: "err", text: "사진을 먼저 추가해 주세요." });
    if (!studentName.trim()) return setMessage({ type: "err", text: "학생을 선택하거나 입력해 주세요." });

    setBusy(true);
    try {
      // 이 학생이 쓰고 있는 번호들 → 빈 번호부터 채우기
      const { data: seqRows, error: seqErr } = await supabase
        .from("wrong_problems")
        .select("seq")
        .eq("student_name", studentName.trim())
        .not("seq", "is", null);
      const used = new Set<number>();
      if (!seqErr) (seqRows ?? []).forEach((r) => { if (r.seq != null) used.add(r.seq as number); });
      const nextAvailable = () => { let k = 1; while (used.has(k)) k++; used.add(k); return k; };

      const rows: Record<string, unknown>[] = [];
      let n = 0;
      for (const it of items) {
        n++;
        setProgress(`사진 업로드 중… (${n}/${items.length})`);
        const ext = it.file.name.split(".").pop() || "jpg";
        const path = `${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage.from(PHOTO_BUCKET).upload(path, it.file);
        if (upErr) throw new Error("사진 업로드 실패: " + upErr.message);
        const problemUrl = supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path).data.publicUrl;

        let cleanedUrl: string | null = null;
        if (it.useCleaned && it.cleanedDataUrl) {
          const blob = await dataUrlToBlob(it.cleanedDataUrl);
          const cpath = `cleaned/${crypto.randomUUID()}.png`;
          const { error: ce } = await supabase.storage.from(PHOTO_BUCKET).upload(cpath, blob, { contentType: "image/png" });
          if (ce) throw new Error("보정본 업로드 실패: " + ce.message);
          cleanedUrl = supabase.storage.from(PHOTO_BUCKET).getPublicUrl(cpath).data.publicUrl;
        }

        rows.push({
          student_name: studentName.trim(),
          problem_image_url: problemUrl,
          cleaned_image_url: cleanedUrl,
          seq: nextAvailable(),
          answer: it.answer.trim() || null,
          unit: it.unit.trim() || null,
          target_count: targetCount,
          uploaded_by: "선생님",
          attempts: 0,
          due_date: nextDue(0),
          status: "대기",
        });
      }

      setProgress("저장 중…");
      let { error: insErr } = await supabase.from("wrong_problems").insert(rows);
      if (insErr && /cleaned_image_url|attempts|due_date|column/.test(insErr.message || "")) {
        const base = rows.map((r) => ({
          student_name: r.student_name,
          problem_image_url: r.problem_image_url,
          target_count: r.target_count,
          uploaded_by: r.uploaded_by,
        }));
        ({ error: insErr } = await supabase.from("wrong_problems").insert(base));
        if (!insErr) {
          setMessage({ type: "ok", text: `${rows.length}개 등록됐어요! 다만 새 기능용 칸이 아직 없어 일부(보정본/출제 일정)는 저장 안 됨. Supabase에 안내된 SQL을 실행하면 다음부턴 모두 저장돼요.` });
          setItems([]);
          return;
        }
      }
      if (insErr) throw new Error(insErr.message);

      setMessage({ type: "ok", text: `${rows.length}개 오답을 등록했어요! "${studentName.trim()}" 학생, ${nextDue(0)}에 첫 출제 예정이에요.` });
      setItems([]);
    } catch (e) {
      setMessage({ type: "err", text: `등록 실패: ${e instanceof Error ? e.message : "알 수 없는 오류"}` });
    } finally {
      setBusy(false);
      setProgress("");
    }
  }

  const anyCleanable = items.some((i) => !i.cleanedDataUrl);

  return (
    <>
      <PageHeader eyebrow="등록" title="오답 등록" sub="틀린 문제를 여러 장 한 번에 올리세요. 한 학생의 오답을 모아서 등록합니다." />

      <div className="card" style={{ padding: 24, maxWidth: 620 }}>
        {/* 사진 추가 */}
        <span className="label">문제 사진 (여러 장 가능)</span>
        <label className="upload-area" style={{ width: "100%" }}>
          <span style={{ color: "var(--muted)", marginBottom: 8 }}><IconCamera size={34} /></span>
          <span style={{ fontWeight: 700, fontSize: 15 }}>사진 찍기 / 여러 장 선택</span>
          <span className="muted" style={{ fontSize: 13, marginTop: 4 }}>한 번에 여러 장 골라도 돼요</span>
          <input type="file" accept="image/*" multiple onChange={onPickFiles} style={{ display: "none" }} />
        </label>

        <label className="btn btn-secondary btn-sm" style={{ marginTop: 10, cursor: "pointer", display: "inline-flex" }}>
          📄 문제집 한 페이지에서 여러 문항 자르기
          <input type="file" accept="image/*" onChange={onPickPage} style={{ display: "none" }} />
        </label>

        {items.length > 0 && (
          <>
            <div className="row" style={{ justifyContent: "space-between", marginTop: 14, marginBottom: 8 }}>
              <span className="label" style={{ margin: 0 }}>추가된 사진 {items.length}장</span>
              <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={detectAllUnits} disabled={items.some((i) => i.detecting)}>🔎 전체 단원 추천</button>
              </div>
            </div>

            {/* 수식 기호: 정답칸을 누른 뒤 탭하면 입력돼요 */}
            <div className="sym-bar">
              {SYMS.map((s) => (
                <button key={s} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => insertSymbol(s)}>{s}</button>
              ))}
            </div>
            <p className="muted" style={{ fontSize: 12, margin: "0 0 8px" }}>정답칸을 누른 뒤 기호를 탭하면 입력돼요. (분수는 1/2, 거듭제곱은 x², 루트는 √5 처럼)</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 10 }}>
              {items.map((it) => (
                <div key={it.id} className="card" style={{ padding: 8 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={it.cleanedDataUrl && it.useCleaned ? it.cleanedDataUrl : it.previewUrl} alt="" style={{ width: "100%", height: 90, objectFit: "cover", borderRadius: 8, background: "var(--bg-soft)" }} />
                  {it.cleaning ? (
                    <div className="muted" style={{ fontSize: 11, textAlign: "center", marginTop: 6 }}>AI 지우는 중…</div>
                  ) : it.cleanedDataUrl ? (
                    <>
                      <label className="row" style={{ gap: 5, fontSize: 11, marginTop: 6, justifyContent: "center", cursor: "pointer" }}>
                        <input type="checkbox" checked={it.useCleaned} onChange={(e) => patch(it.id, { useCleaned: e.target.checked })} />
                        정리본 사용
                      </label>
                      <div style={{ display: "grid", gap: 4 }}>
                        <button type="button" className="btn btn-secondary btn-sm" style={{ fontSize: 11 }} onClick={() => setCropId(it.id)}>✂️ 다시 자르기</button>
                        <button type="button" className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} onClick={() => cleanOne(it)}>🤖 AI로 더 지우기</button>
                      </div>
                    </>
                  ) : (
                    <div style={{ display: "grid", gap: 4, marginTop: 6 }}>
                      <button type="button" className="btn btn-secondary btn-sm" style={{ fontSize: 11 }} onClick={() => setCropId(it.id)}>✂️ 잘라내기(무료)</button>
                      <button type="button" className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} onClick={() => cleanOne(it)}>🤖 AI 지우기</button>
                    </div>
                  )}
                  {it.cleanError && <div style={{ fontSize: 10, color: "var(--danger-ink)", marginTop: 4 }}>{it.cleanError}</div>}
                  <input
                    className="input"
                    value={it.answer}
                    onChange={(e) => patch(it.id, { answer: e.target.value })}
                    onFocus={() => setFocusedAnswerId(it.id)}
                    placeholder="정답 (채점용)"
                    style={{ marginTop: 6, padding: "7px 9px", fontSize: 12 }}
                  />
                  <div className="row" style={{ gap: 4, marginTop: 4 }}>
                    <input className="input" value={it.unit} onChange={(e) => patch(it.id, { unit: e.target.value })} placeholder="단원" style={{ padding: "7px 8px", fontSize: 12 }} />
                    <button type="button" className="btn btn-secondary btn-sm" style={{ fontSize: 11, padding: "7px 9px", flexShrink: 0 }} onClick={() => detectUnit(it)} disabled={it.detecting}>{it.detecting ? "…" : "🔎"}</button>
                  </div>
                  <button type="button" className="btn btn-ghost btn-sm" style={{ width: "100%", color: "var(--danger-ink)", fontSize: 11 }} onClick={() => removeItem(it.id)}>삭제</button>
                </div>
              ))}
            </div>
          </>
        )}

        {/* 학생 */}
        <div className="field" style={{ marginTop: 20 }}>
          <label className="label">학생</label>
          {students.length > 0 && !typingName ? (
            <select className="select" value={studentName} onChange={(e) => { if (e.target.value === "__type__") { setTypingName(true); setStudentName(""); } else setStudentName(e.target.value); }}>
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
            <button type="button" className="btn btn-ghost btn-sm" style={{ marginTop: 6, paddingLeft: 0 }} onClick={() => { setTypingName(false); setStudentName(""); }}>← 목록에서 선택</button>
          )}
        </div>

        {/* 최대 반복 */}
        <div className="field">
          <label className="label">최대 반복 횟수 (며칠 간격으로 최대 몇 번 출제할까요?)</label>
          <div className="stepper">
            <button type="button" className="step-btn" onClick={() => setTargetCount((n) => Math.max(1, n - 1))}>−</button>
            <span className="step-val">{targetCount}</span>
            <button type="button" className="step-btn" onClick={() => setTargetCount((n) => Math.min(5, n + 1))}>+</button>
            <span className="muted" style={{ fontSize: 13, marginLeft: 4 }}>회</span>
          </div>
          <p className="muted" style={{ fontSize: 12, marginTop: 6 }}>1→3→7→14→30일 간격으로 재출제하고, 끝까지 못 풀면 「경고 문항」으로 남겨요.</p>
        </div>

        <button className="btn btn-primary btn-lg btn-block" style={{ marginTop: 12 }} onClick={submitAll} disabled={busy}>
          {busy ? progress || "올리는 중…" : `오답 ${items.length || ""}개 등록하기`}
        </button>

        {message && <div className={`alert ${message.type === "ok" ? "alert-ok" : "alert-err"}`} style={{ marginTop: 16, marginBottom: 0 }}>{message.type === "ok" ? "✅ " : "❌ "}{message.text}</div>}
      </div>

      {cropId && (() => {
        const it = items.find((i) => i.id === cropId);
        if (!it) return null;
        return (
          <CropModal
            src={it.previewUrl}
            onCancel={() => setCropId(null)}
            onDone={(d) => { patch(cropId, { cleanedDataUrl: d, useCleaned: true }); setCropId(null); }}
          />
        );
      })()}

      {pageSrc && <MultiCropModal src={pageSrc} onAdd={addCrop} onClose={() => setPageSrc(null)} />}
    </>
  );
}

function MultiCropModal({ src, onAdd, onClose }: { src: string; onAdd: (dataUrl: string) => void | Promise<void>; onClose: () => void }) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [rect, setRect] = useState<Rect | null>(null);
  const [start, setStart] = useState<{ x: number; y: number } | null>(null);
  const [count, setCount] = useState(0);

  function pos(e: React.PointerEvent) {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    return { x: Math.max(0, Math.min(e.clientX - r.left, r.width)), y: Math.max(0, Math.min(e.clientY - r.top, r.height)) };
  }
  function down(e: React.PointerEvent) {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const p = pos(e);
    setStart(p);
    setRect({ x: p.x, y: p.y, w: 0, h: 0 });
  }
  function move(e: React.PointerEvent) {
    if (!start) return;
    const p = pos(e);
    setRect({ x: Math.min(start.x, p.x), y: Math.min(start.y, p.y), w: Math.abs(p.x - start.x), h: Math.abs(p.y - start.y) });
  }
  function up() {
    setStart(null);
  }
  function addCurrent() {
    const img = imgRef.current;
    if (!img || !rect || rect.w < 8 || rect.h < 8) return;
    const sx = img.naturalWidth / img.clientWidth;
    const sy = img.naturalHeight / img.clientHeight;
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(rect.w * sx));
    canvas.height = Math.max(1, Math.round(rect.h * sy));
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(img, rect.x * sx, rect.y * sy, rect.w * sx, rect.h * sy, 0, 0, canvas.width, canvas.height);
    onAdd(canvas.toDataURL("image/png"));
    setCount((c) => c + 1);
    setRect(null);
  }

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(15,23,42,0.8)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div className="card" style={{ padding: 16, maxWidth: 620, width: "100%", maxHeight: "92vh", overflow: "auto" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ fontWeight: 800, marginBottom: 6 }}>한 페이지에서 여러 문항 자르기</div>
        <p className="muted" style={{ fontSize: 12, marginBottom: 10 }}>문제 하나를 드래그로 감싼 뒤 <b>「이 영역 문항 추가」</b>를 누르세요. 여러 번 반복해서 한 페이지를 여러 문항으로 나눌 수 있어요.</p>
        <div style={{ position: "relative", touchAction: "none", userSelect: "none" }} onPointerDown={down} onPointerMove={move} onPointerUp={up}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img ref={imgRef} src={src} alt="" draggable={false} style={{ width: "100%", display: "block", borderRadius: 8 }} />
          {rect && <div style={{ position: "absolute", left: rect.x, top: rect.y, width: rect.w, height: rect.h, border: "2px solid var(--accent)", background: "rgba(63,110,165,0.18)", pointerEvents: "none" }} />}
        </div>
        <div className="row" style={{ gap: 8, marginTop: 14, justifyContent: "space-between", flexWrap: "wrap" }}>
          <span className="muted" style={{ fontSize: 13, fontWeight: 700 }}>추가됨: {count}문항</span>
          <div className="row" style={{ gap: 8 }}>
            <button className="btn btn-secondary" onClick={addCurrent} disabled={!rect || rect.w < 8}>✂️ 이 영역 문항 추가</button>
            <button className="btn btn-primary" onClick={onClose}>완료</button>
          </div>
        </div>
      </div>
    </div>
  );
}

type Rect = { x: number; y: number; w: number; h: number };

function CropModal({ src, onCancel, onDone }: { src: string; onCancel: () => void; onDone: (dataUrl: string) => void }) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [rect, setRect] = useState<Rect | null>(null);
  const [start, setStart] = useState<{ x: number; y: number } | null>(null);

  function pos(e: React.PointerEvent) {
    const el = e.currentTarget as HTMLElement;
    const r = el.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(e.clientX - r.left, r.width)),
      y: Math.max(0, Math.min(e.clientY - r.top, r.height)),
    };
  }
  function down(e: React.PointerEvent) {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const p = pos(e);
    setStart(p);
    setRect({ x: p.x, y: p.y, w: 0, h: 0 });
  }
  function move(e: React.PointerEvent) {
    if (!start) return;
    const p = pos(e);
    setRect({ x: Math.min(start.x, p.x), y: Math.min(start.y, p.y), w: Math.abs(p.x - start.x), h: Math.abs(p.y - start.y) });
  }
  function up() {
    setStart(null);
  }
  function confirm() {
    const img = imgRef.current;
    if (!img) return;
    const sx = img.naturalWidth / img.clientWidth;
    const sy = img.naturalHeight / img.clientHeight;
    let r = rect;
    if (!r || r.w < 8 || r.h < 8) r = { x: 0, y: 0, w: img.clientWidth, h: img.clientHeight };
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(r.w * sx));
    canvas.height = Math.max(1, Math.round(r.h * sy));
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(img, r.x * sx, r.y * sy, r.w * sx, r.h * sy, 0, 0, canvas.width, canvas.height);
    onDone(canvas.toDataURL("image/png"));
  }

  return (
    <div onClick={onCancel} style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(15,23,42,0.8)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div className="card" style={{ padding: 16, maxWidth: 560, width: "100%", maxHeight: "92vh", overflow: "auto" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ fontWeight: 800, marginBottom: 6 }}>잘라낼 영역을 드래그하세요</div>
        <p className="muted" style={{ fontSize: 12, marginBottom: 10 }}>문제 부분만 손가락/마우스로 드래그해 사각형으로 선택하면, 낙서가 있는 바깥은 잘려나가요. (무료)</p>
        <div style={{ position: "relative", touchAction: "none", userSelect: "none" }} onPointerDown={down} onPointerMove={move} onPointerUp={up}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img ref={imgRef} src={src} alt="" draggable={false} style={{ width: "100%", display: "block", borderRadius: 8 }} />
          {rect && <div style={{ position: "absolute", left: rect.x, top: rect.y, width: rect.w, height: rect.h, border: "2px solid var(--accent)", background: "rgba(63,110,165,0.18)", pointerEvents: "none" }} />}
        </div>
        <div className="row" style={{ gap: 8, marginTop: 14, justifyContent: "flex-end" }}>
          <button className="btn btn-secondary" onClick={onCancel}>취소</button>
          <button className="btn btn-primary" onClick={confirm}>✂️ 이 영역으로 자르기</button>
        </div>
      </div>
    </div>
  );
}
