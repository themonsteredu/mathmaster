"use client";

import { useEffect, useRef, useState } from "react";
import { supabase, PHOTO_BUCKET } from "@/lib/supabase";
import { PageHeader } from "@/components/ui";
import { IconCamera, IconSearch } from "@/components/icons";
import { AcademyLogo } from "@/components/Logo";
import { pdfToImages, imagesToPdfBlob, pdfPageCount } from "@/lib/pdf";

type ExamPaper = {
  id: string;
  title: string;
  category: string | null;
  image_url: string;
  school: string | null;
  grade: number | null;
  term: number | null;
  exam_type: string | null;
  year: number | null;
  file_type: string | null;
  created_at: string;
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
function ymd(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}
function isPdf(p: { file_type?: string | null; image_url: string }) {
  return p.file_type === "pdf" || /\.pdf($|\?)/i.test(p.image_url);
}
function gradeTermLabel(p: { grade: number | null; term: number | null }) {
  if (p.grade && p.term) return `${p.grade}-${p.term}`;
  if (p.grade) return `${p.grade}학년`;
  return "";
}
// 제목/분류를 자동으로 조립 (사용자가 따로 안 적어도 찾기 쉽게)
function autoTitle(f: { year: number | null; school: string; grade: number | null; term: number | null; exam_type: string }) {
  const parts: string[] = [];
  if (f.year) parts.push(`${f.year}`);
  if (f.school.trim()) parts.push(f.school.trim());
  if (f.grade && f.term) parts.push(`${f.grade}-${f.term}`);
  else if (f.grade) parts.push(`${f.grade}학년`);
  if (f.exam_type) parts.push(f.exam_type);
  return parts.join(" ");
}

const THIS_YEAR = 2026;
const YEARS = [THIS_YEAR, THIS_YEAR - 1, THIS_YEAR - 2, THIS_YEAR - 3, THIS_YEAR - 4];

export default function ExamsPage() {
  const [papers, setPapers] = useState<ExamPaper[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [needSql, setNeedSql] = useState(false);

  // 검색 / 필터
  const [q, setQ] = useState("");
  const [fYear, setFYear] = useState<number | "전체">("전체");
  const [fGT, setFGT] = useState("전체"); // 학년-학기 (예: 2-1)
  const [fType, setFType] = useState("전체"); // 중간/기말

  // 업로드 폼
  const [adding, setAdding] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [fileIsPdf, setFileIsPdf] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [cleanedDataUrl, setCleanedDataUrl] = useState<string | null>(null);
  const [useCleaned, setUseCleaned] = useState(true);
  const [cleaning, setCleaning] = useState(false);
  // PDF 낙서 지우기 (페이지별 이미지로 변환 → AI → 페이지마다 원본/지운본 선택 → PDF로 합침)
  const [pdfPages, setPdfPages] = useState<number>(0);
  const [pdfOriginals, setPdfOriginals] = useState<string[]>([]);
  const [pdfCleaned, setPdfCleaned] = useState<string[]>([]);
  const [pageUseClean, setPageUseClean] = useState<boolean[]>([]);

  const [title, setTitle] = useState("");
  const [school, setSchool] = useState("");
  const [grade, setGrade] = useState<number | null>(null);
  const [term, setTerm] = useState<number | null>(null);
  const [examType, setExamType] = useState("");
  const [year, setYear] = useState<number>(THIS_YEAR);

  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");

  // 크게 보기
  const [viewing, setViewing] = useState<ExamPaper | null>(null);

  async function load() {
    const { data, error: e } = await supabase
      .from("exam_papers")
      .select("*")
      .order("created_at", { ascending: false });
    if (e) {
      if (/exam_papers|relation|does not exist|column/.test(e.message || "")) setNeedSql(true);
      else setError(e.message);
    }
    setPapers((data as ExamPaper[]) ?? []);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const pdf = f.type === "application/pdf" || /\.pdf$/i.test(f.name);
    setFile(f);
    setFileIsPdf(pdf);
    setPreviewUrl(URL.createObjectURL(f));
    setCleanedDataUrl(null);
    setPdfOriginals([]);
    setPdfCleaned([]);
    setPageUseClean([]);
    setPdfPages(0);
    setUseCleaned(!pdf);
    if (!title.trim()) setTitle(f.name.replace(/\.[^.]+$/, ""));
    e.target.value = "";
    if (pdf) pdfPageCount(f).then(setPdfPages).catch(() => setPdfPages(0));
  }

  async function cleanOneImage(dataUrl: string, mimeType: string): Promise<string> {
    const res = await fetch("/api/clean-image", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ data: dataUrl.split(",")[1], mimeType }) });
    const j = await res.json();
    if (!res.ok) throw new Error(j.error || "처리 실패");
    return `data:${j.mimeType};base64,${j.image}`;
  }

  async function cleanImage() {
    if (!file || fileIsPdf) return;
    setCleaning(true);
    setError("");
    try {
      const { data, mimeType } = await fileToBase64(file);
      setCleanedDataUrl(await cleanOneImage(`data:${mimeType};base64,${data}`, mimeType));
      setUseCleaned(true);
    } catch (e) {
      setError(`낙서 지우기 실패: ${e instanceof Error ? e.message : "오류"}`);
    } finally {
      setCleaning(false);
    }
  }

  // PDF 낙서 지우기: 페이지 → 이미지 → AI 지우기 → 다시 PDF로 합침
  async function cleanPdf() {
    if (!file || !fileIsPdf) return;
    const pages = pdfPages || (await pdfPageCount(file).catch(() => 1));
    if (!confirm(`이 PDF는 ${pages}페이지예요.\n페이지마다 AI가 낙서를 지워요 (페이지당 약 55원, 총 약 ${pages * 55}원).\n진행할까요?`)) return;
    setCleaning(true);
    setError("");
    try {
      setProgress("PDF를 페이지로 변환 중…");
      const images = await pdfToImages(file);
      setPdfOriginals(images);
      const cleaned: string[] = [];
      for (let i = 0; i < images.length; i++) {
        setProgress(`AI 낙서 지우는 중… (${i + 1}/${images.length}페이지)`);
        try {
          cleaned.push(await cleanOneImage(images[i], "image/jpeg"));
        } catch {
          cleaned.push(images[i]); // 한 페이지 실패하면 원본 페이지 유지
        }
      }
      setPdfCleaned(cleaned);
      setPageUseClean(cleaned.map(() => true));
      setUseCleaned(true);
    } catch (e) {
      setError(`PDF 낙서 지우기 실패: ${e instanceof Error ? e.message : "오류"}`);
    } finally {
      setCleaning(false);
      setProgress("");
    }
  }

  function resetForm() {
    setFile(null);
    setFileIsPdf(false);
    setPreviewUrl(null);
    setCleanedDataUrl(null);
    setPdfOriginals([]);
    setPdfCleaned([]);
    setPageUseClean([]);
    setPdfPages(0);
    setUseCleaned(true);
    setTitle("");
    setSchool("");
    setGrade(null);
    setTerm(null);
    setExamType("");
    setYear(THIS_YEAR);
    setAdding(false);
  }

  async function save() {
    setError("");
    if (!file) return setError("시험지 사진 또는 PDF를 먼저 골라 주세요.");
    const finalTitle = title.trim() || autoTitle({ year, school, grade, term, exam_type: examType });
    if (!finalTitle) return setError("제목을 입력하거나 학교·학년·시험을 골라 주세요. (나중에 찾을 때 써요)");
    setBusy(true);
    try {
      setProgress(fileIsPdf ? "PDF 올리는 중…" : "사진 올리는 중…");
      let blob: Blob = file;
      let ext = file.name.split(".").pop() || (fileIsPdf ? "pdf" : "jpg");
      let contentType = file.type || (fileIsPdf ? "application/pdf" : "image/jpeg");
      if (fileIsPdf && useCleaned && pdfCleaned.length) {
        // 페이지마다 선택된(원본/지운본) 이미지를 모아 한 PDF로 합침
        const chosen = pdfCleaned.map((c, i) => (pageUseClean[i] ? c : pdfOriginals[i]));
        blob = await imagesToPdfBlob(chosen);
        ext = "pdf";
        contentType = "application/pdf";
      } else if (!fileIsPdf && useCleaned && cleanedDataUrl) {
        blob = await dataUrlToBlob(cleanedDataUrl);
        ext = "png";
        contentType = "image/png";
      }
      const path = `exams/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from(PHOTO_BUCKET).upload(path, blob, { contentType });
      if (upErr) throw new Error("업로드 실패: " + upErr.message);
      const imageUrl = supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path).data.publicUrl;

      setProgress("저장 중…");
      const full = {
        title: finalTitle,
        category: school.trim() || examType || null,
        image_url: imageUrl,
        school: school.trim() || null,
        grade,
        term,
        exam_type: examType || null,
        year,
        file_type: fileIsPdf ? "pdf" : "image",
      };
      let { error: insErr } = await supabase.from("exam_papers").insert(full);
      // 새 칸이 아직 없으면 기본 칸만으로 재시도 (마이그레이션 전에도 동작)
      if (insErr && /school|grade|term|exam_type|year|file_type|column/.test(insErr.message || "")) {
        ({ error: insErr } = await supabase.from("exam_papers").insert({ title: finalTitle, category: full.category, image_url: imageUrl }));
        if (!insErr) {
          setError("저장됐어요. 다만 '학교·학기·시험' 구분 칸이 아직 없어 그 정보는 빠졌어요. Supabase에 안내된 SQL을 한 번 실행하면 다음부턴 모두 저장돼요.");
          resetForm();
          load();
          return;
        }
      }
      if (insErr) {
        if (/exam_papers|relation|does not exist/.test(insErr.message || "")) {
          setNeedSql(true);
          throw new Error("아직 '기출 시험지' 보관함 표가 Supabase에 없어요. 아래 안내 SQL을 한 번 실행해 주세요.");
        }
        throw new Error(insErr.message);
      }
      resetForm();
      load();
    } catch (e) {
      setError(`저장 실패: ${e instanceof Error ? e.message : "알 수 없는 오류"}`);
    } finally {
      setBusy(false);
      setProgress("");
    }
  }

  async function remove(p: ExamPaper) {
    if (!confirm(`"${p.title}" 기출 시험지를 삭제할까요? (되돌릴 수 없어요)`)) return;
    setError("");
    setPapers((prev) => prev.filter((x) => x.id !== p.id));
    if (viewing?.id === p.id) setViewing(null);
    const { error: e } = await supabase.from("exam_papers").delete().eq("id", p.id);
    if (e) {
      setError("삭제 실패: " + e.message);
      load();
    }
  }

  // 필터 선택지 (모아둔 데이터 기준)
  const years = Array.from(new Set(papers.map((p) => p.year).filter(Boolean) as number[])).sort((a, b) => b - a);
  const gradeTerms = Array.from(new Set(papers.map((p) => gradeTermLabel(p)).filter(Boolean))).sort();
  const examTypes = Array.from(new Set(papers.map((p) => p.exam_type).filter(Boolean) as string[]));

  const filtered = papers.filter((p) => {
    if (fYear !== "전체" && p.year !== fYear) return false;
    if (fGT !== "전체" && gradeTermLabel(p) !== fGT) return false;
    if (fType !== "전체" && p.exam_type !== fType) return false;
    if (q) {
      const hay = `${p.title} ${p.school ?? ""} ${p.category ?? ""} ${p.exam_type ?? ""} ${gradeTermLabel(p)} ${p.year ?? ""}`.toLowerCase();
      if (!hay.includes(q.toLowerCase())) return false;
    }
    return true;
  });

  const shownImg = useCleaned && cleanedDataUrl ? cleanedDataUrl : previewUrl;
  const previewTitle = title.trim() || autoTitle({ year, school, grade, term, exam_type: examType });

  const chip = (active: boolean): string => `btn btn-sm ${active ? "btn-primary" : "btn-secondary"}`;

  return (
    <>
      <div className="no-print">
        <PageHeader
          eyebrow="기출 보관함"
          title="기출 시험지"
          sub="기출·시험지를 사진이나 PDF로 올려두세요. 학교·학년/학기·중간/기말·연도로 구분해 모아두면 나중에 쉽게 찾아 다시 풀릴 수 있어요."
          actions={
            <button className="btn btn-primary" onClick={() => setAdding((v) => !v)}>
              <IconCamera size={14} />시험지 올리기
            </button>
          }
        />

        {error && <div className="alert alert-err">{error}</div>}

        {needSql && (
          <div className="alert alert-info" style={{ lineHeight: 1.7 }}>
            ⚙️ <b>처음 한 번만</b> 설정이 필요해요. Supabase → SQL Editor에 아래를 붙여넣고 <b>Run</b> 하세요. 그러면 기출 보관함이 켜져요.
            <pre style={{ whiteSpace: "pre-wrap", background: "#fff", border: "1px solid var(--line)", borderRadius: 8, padding: 12, marginTop: 10, fontSize: 12 }}>{`create table if not exists exam_papers (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text,
  image_url text not null,
  school text, grade int, term int,
  exam_type text, year int,
  file_type text default 'image',
  created_at timestamptz not null default now()
);
alter table exam_papers add column if not exists school    text;
alter table exam_papers add column if not exists grade     int;
alter table exam_papers add column if not exists term      int;
alter table exam_papers add column if not exists exam_type text;
alter table exam_papers add column if not exists year      int;
alter table exam_papers add column if not exists file_type text default 'image';
alter table exam_papers enable row level security;
drop policy if exists "allow all - exam_papers" on exam_papers;
create policy "allow all - exam_papers" on exam_papers for all using (true) with check (true);`}</pre>
          </div>
        )}

        {adding && (
          <div className="card" style={{ padding: 20, marginBottom: 16, maxWidth: 640 }}>
            {!previewUrl ? (
              <label className="upload-area" style={{ width: "100%" }}>
                <span style={{ color: "var(--muted)", marginBottom: 8 }}><IconCamera size={34} /></span>
                <span style={{ fontWeight: 700, fontSize: 15 }}>기출/시험지 사진 또는 PDF 고르기</span>
                <span className="muted" style={{ fontSize: 13, marginTop: 4 }}>사진(JPG/PNG)이나 PDF 한 개를 올려요</span>
                <input ref={fileInputRef} type="file" accept="image/*,application/pdf,.pdf" onChange={onPickFile} style={{ display: "none" }} />
              </label>
            ) : (
              <>
                {fileIsPdf ? (
                  pdfCleaned.length === 0 ? (
                    <div style={{ width: "100%", height: 200, borderRadius: 10, background: "var(--bg-soft)", border: "1px solid var(--line)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
                      <span style={{ fontSize: 44 }}>📄</span>
                      <span style={{ fontWeight: 700 }}>PDF 파일{pdfPages ? ` · ${pdfPages}페이지` : ""}</span>
                      <span className="muted" style={{ fontSize: 12 }}>{file?.name}</span>
                    </div>
                  ) : null
                ) : (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={shownImg ?? undefined} alt="미리보기" style={{ width: "100%", maxHeight: 360, objectFit: "contain", borderRadius: 10, background: "var(--bg-soft)" }} />
                    {cleanedDataUrl && (
                      <p className="muted" style={{ fontSize: 12, marginTop: 6 }}>
                        {useCleaned ? "지운 결과예요." : "원본이에요."} <b>「낙서 지운 버전 사용」</b> 체크를 켜고 끄며 원본과 비교해 보세요. 너무 많이 지워졌으면 체크를 끄면 원본 그대로 저장돼요.
                      </p>
                    )}
                  </>
                )}
                <div className="row" style={{ gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => fileInputRef.current?.click()} disabled={cleaning}>🖼 다른 파일</button>
                  {!fileIsPdf && (
                    <button type="button" className="btn btn-ghost btn-sm" onClick={cleanImage} disabled={cleaning}>{cleaning ? "AI 지우는 중…" : cleanedDataUrl ? "🤖 다시 지우기" : "🤖 AI 낙서 지우기"}</button>
                  )}
                  {fileIsPdf && (
                    <button type="button" className="btn btn-ghost btn-sm" onClick={cleanPdf} disabled={cleaning}>{cleaning ? progress || "처리 중…" : pdfCleaned.length ? "🤖 다시 지우기" : "🤖 PDF 낙서 지우기"}</button>
                  )}
                  {((!fileIsPdf && cleanedDataUrl) || (fileIsPdf && pdfCleaned.length > 0)) && (
                    <label className="row" style={{ gap: 6, fontSize: 13, cursor: "pointer", fontWeight: 600 }}>
                      <input type="checkbox" checked={useCleaned} onChange={(e) => setUseCleaned(e.target.checked)} />
                      낙서 지운 버전 사용
                    </label>
                  )}
                  <input ref={fileInputRef} type="file" accept="image/*,application/pdf,.pdf" onChange={onPickFile} style={{ display: "none" }} />
                </div>
                {fileIsPdf && cleaning && progress && <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>⏳ {progress}</div>}
                {fileIsPdf && pdfCleaned.length === 0 && !cleaning && <p className="muted" style={{ fontSize: 12, marginTop: 6 }}>PDF의 낙서를 지우면 페이지마다 AI가 처리해요{pdfPages ? ` (총 ${pdfPages}페이지, 약 ${pdfPages * 55}원)` : ""}. 안 지우고 그대로 보관해도 돼요.</p>}

                {/* PDF 페이지별 비교 — 너무 많이 지워진 페이지는 '원본'으로 되돌리기 */}
                {fileIsPdf && pdfCleaned.length > 0 && useCleaned && (
                  <div className="card flat" style={{ padding: 12, marginTop: 12, background: "var(--bg-soft)" }}>
                    <div className="row" style={{ justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
                      <span style={{ fontWeight: 800, fontSize: 14 }}>페이지별 확인 ({pageUseClean.filter(Boolean).length}/{pdfCleaned.length} 지운본)</span>
                      <div className="row" style={{ gap: 6 }}>
                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => setPageUseClean(pdfCleaned.map(() => false))}>전체 원본</button>
                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => setPageUseClean(pdfCleaned.map(() => true))}>전체 지운본</button>
                      </div>
                    </div>
                    <p className="muted" style={{ fontSize: 12, margin: "0 0 10px" }}>지운 후 문제까지 사라진 페이지가 있으면 그 페이지의 <b>「원본」</b>을 눌러 되돌리세요. 고른 대로 저장돼요.</p>
                    <div className="stack" style={{ gap: 12 }}>
                      {pdfCleaned.map((c, i) => {
                        const useClean = pageUseClean[i];
                        const opt = (label: string, src: string, sel: boolean, onSel: () => void) => (
                          <button type="button" onClick={onSel} style={{ flex: 1, minWidth: 0, padding: 4, borderRadius: 8, cursor: "pointer", background: "#fff", border: `2px solid ${sel ? "var(--accent)" : "var(--line)"}`, boxShadow: sel ? "0 0 0 2px rgba(63,110,165,0.15)" : "none" }}>
                            <div className="row" style={{ justifyContent: "center", gap: 4, fontSize: 11, fontWeight: 700, marginBottom: 4, color: sel ? "var(--accent-ink)" : "var(--faint)" }}>{sel ? "✓ " : ""}{label}</div>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={src} alt={label} style={{ width: "100%", height: 150, objectFit: "contain", background: "var(--bg-soft)", borderRadius: 4 }} />
                          </button>
                        );
                        return (
                          <div key={i}>
                            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{i + 1}페이지</div>
                            <div className="row" style={{ gap: 8, alignItems: "stretch" }}>
                              {opt("원본", pdfOriginals[i], !useClean, () => setPageUseClean((prev) => prev.map((v, k) => (k === i ? false : v))))}
                              {opt("지운 후", c, useClean, () => setPageUseClean((prev) => prev.map((v, k) => (k === i ? true : v))))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 구분 정보 */}
                <div className="field" style={{ marginTop: 16 }}>
                  <label className="label">연도</label>
                  <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
                    {YEARS.map((y) => (
                      <button key={y} type="button" className={chip(year === y)} onClick={() => setYear(y)}>{y}</button>
                    ))}
                  </div>
                </div>
                <div className="field">
                  <label className="label">학년 · 학기</label>
                  <div className="row" style={{ gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                    {[1, 2, 3].map((g) => (
                      <button key={g} type="button" className={chip(grade === g)} onClick={() => setGrade(grade === g ? null : g)}>{g}학년</button>
                    ))}
                    <span style={{ width: 8 }} />
                    {[1, 2].map((t) => (
                      <button key={t} type="button" className={chip(term === t)} onClick={() => setTerm(term === t ? null : t)}>{t}학기</button>
                    ))}
                    {grade && term && <span className="muted" style={{ fontSize: 13, fontWeight: 700, marginLeft: 4 }}>→ {grade}-{term}</span>}
                  </div>
                </div>
                <div className="field">
                  <label className="label">시험</label>
                  <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
                    {["중간", "기말"].map((t) => (
                      <button key={t} type="button" className={chip(examType === t)} onClick={() => setExamType(examType === t ? "" : t)}>{t}고사</button>
                    ))}
                  </div>
                </div>
                <div className="field">
                  <label className="label">학교 (선택)</label>
                  <input className="input" value={school} onChange={(e) => setSchool(e.target.value)} placeholder="예: ○○중학교" list="exam-schools" />
                  <datalist id="exam-schools">
                    {Array.from(new Set(papers.map((p) => p.school).filter(Boolean) as string[])).map((s) => <option key={s} value={s} />)}
                  </datalist>
                </div>
                <div className="field">
                  <label className="label">제목 (비워두면 자동으로 만들어요)</label>
                  <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={previewTitle || "예: 2026 ○○중 2-1 중간"} />
                  {!title.trim() && previewTitle && <p className="muted" style={{ fontSize: 12, marginTop: 6 }}>자동 제목: <b>{previewTitle}</b></p>}
                </div>

                <div className="row" style={{ gap: 8, marginTop: 8 }}>
                  <button className="btn btn-primary" onClick={save} disabled={busy}>{busy ? progress || "저장 중…" : "📥 보관함에 저장"}</button>
                  <button className="btn btn-secondary" onClick={resetForm} disabled={busy}>취소</button>
                </div>
              </>
            )}
          </div>
        )}

        {/* 검색 / 구분 필터 */}
        {papers.length > 0 && (
          <div className="stack" style={{ gap: 10, marginBottom: 14 }}>
            <div className="row" style={{ flex: 1, minWidth: 200, background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 10, padding: "0 12px", gap: 6 }}>
              <IconSearch size={16} className="muted" />
              <input className="input" style={{ border: 0, padding: "10px 4px", fontSize: 15 }} placeholder="제목·학교·학년·시험으로 검색" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            {years.length > 0 && (
              <div className="row" style={{ gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                <span className="muted" style={{ fontSize: 12, fontWeight: 700, width: 44 }}>연도</span>
                <button className={chip(fYear === "전체")} onClick={() => setFYear("전체")}>전체</button>
                {years.map((y) => <button key={y} className={chip(fYear === y)} onClick={() => setFYear(y)}>{y}</button>)}
              </div>
            )}
            {gradeTerms.length > 0 && (
              <div className="row" style={{ gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                <span className="muted" style={{ fontSize: 12, fontWeight: 700, width: 44 }}>학년·학기</span>
                <button className={chip(fGT === "전체")} onClick={() => setFGT("전체")}>전체</button>
                {gradeTerms.map((g) => <button key={g} className={chip(fGT === g)} onClick={() => setFGT(g)}>{g}</button>)}
              </div>
            )}
            {examTypes.length > 0 && (
              <div className="row" style={{ gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                <span className="muted" style={{ fontSize: 12, fontWeight: 700, width: 44 }}>시험</span>
                <button className={chip(fType === "전체")} onClick={() => setFType("전체")}>전체</button>
                {examTypes.map((t) => <button key={t} className={chip(fType === t)} onClick={() => setFType(t)}>{t}</button>)}
              </div>
            )}
          </div>
        )}

        {loading ? (
          <div className="alert alert-info">불러오는 중…</div>
        ) : papers.length === 0 ? (
          <div className="empty card flat"><h4>아직 모아둔 기출 시험지가 없어요</h4>위 「시험지 올리기」로 기출·시험지를 사진이나 PDF로 올려 보세요.</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12 }}>
            {filtered.map((p) => {
              const pdf = isPdf(p);
              const gt = gradeTermLabel(p);
              return (
                <div key={p.id} className="card" style={{ padding: 10, cursor: "pointer" }} onClick={() => setViewing(p)}>
                  {pdf ? (
                    <div style={{ width: "100%", height: 150, borderRadius: 8, background: "var(--bg-soft)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4 }}>
                      <span style={{ fontSize: 38 }}>📄</span>
                      <span className="muted" style={{ fontSize: 11, fontWeight: 700 }}>PDF</span>
                    </div>
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.image_url} alt={p.title} style={{ width: "100%", height: 150, objectFit: "cover", borderRadius: 8, background: "var(--bg-soft)" }} />
                  )}
                  <div className="row" style={{ gap: 4, marginTop: 8, flexWrap: "wrap" }}>
                    {p.year && <span className="chip" style={{ fontSize: 10 }}>{p.year}</span>}
                    {gt && <span className="chip" style={{ fontSize: 10 }}>{gt}</span>}
                    {p.exam_type && <span className="chip" style={{ fontSize: 10 }}>{p.exam_type}</span>}
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 14, marginTop: 6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.title}</div>
                  <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>{p.school ? `${p.school} · ` : ""}{ymd(p.created_at)}</div>
                </div>
              );
            })}
            {filtered.length === 0 && <div className="empty card flat" style={{ gridColumn: "1 / -1" }}><h4>검색 결과가 없어요</h4></div>}
          </div>
        )}
      </div>

      {/* 크게 보기 + 인쇄 */}
      {viewing && (
        <div className="no-print" onClick={() => setViewing(null)} style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(15,23,42,0.8)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div className="card" style={{ padding: 16, maxWidth: 760, width: "100%", maxHeight: "94vh", overflow: "auto" }} onClick={(e) => e.stopPropagation()}>
            <div className="row" style={{ justifyContent: "space-between", marginBottom: 10, gap: 8, flexWrap: "wrap" }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: 16 }}>{viewing.title}</div>
                <div className="muted" style={{ fontSize: 12 }}>
                  {[viewing.year, gradeTermLabel(viewing), viewing.exam_type, viewing.school].filter(Boolean).join(" · ") || ymd(viewing.created_at)}
                </div>
              </div>
              <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
                {isPdf(viewing) ? (
                  <a className="btn btn-primary btn-sm" href={viewing.image_url} target="_blank" rel="noreferrer">📄 PDF 열기 / 인쇄</a>
                ) : (
                  <button className="btn btn-primary btn-sm" onClick={() => window.print()}>🖨️ 인쇄 / PDF</button>
                )}
                <button className="btn btn-ghost btn-sm" style={{ color: "var(--danger-ink)" }} onClick={() => remove(viewing)}>삭제</button>
                <button className="btn btn-secondary btn-sm" onClick={() => setViewing(null)}>닫기</button>
              </div>
            </div>
            {isPdf(viewing) ? (
              <iframe src={viewing.image_url} title={viewing.title} style={{ width: "100%", height: "70vh", border: "1px solid var(--line)", borderRadius: 8, background: "#fff" }} />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={viewing.image_url} alt={viewing.title} style={{ width: "100%", borderRadius: 8, background: "var(--bg-soft)" }} />
            )}
          </div>
        </div>
      )}

      {/* 인쇄 전용 — 이미지 시험지를 A4로 깔끔하게 출력 (PDF는 새 탭에서 인쇄) */}
      {viewing && !isPdf(viewing) && (
        <div className="print-only">
          <div className="ws-head">
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><AcademyLogo size={22} /><span className="t">{viewing.title}</span></span>
            <span style={{ fontSize: 13, color: "#222", fontWeight: 700 }}>이름 ______ / 날짜 ______</span>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={viewing.image_url} alt={viewing.title} style={{ width: "100%", marginTop: 10 }} />
        </div>
      )}
    </>
  );
}
