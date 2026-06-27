"use client";

import { useEffect, useRef, useState } from "react";
import { supabase, PHOTO_BUCKET } from "@/lib/supabase";
import { PageHeader } from "@/components/ui";
import { IconCamera, IconSearch } from "@/components/icons";
import { AcademyLogo } from "@/components/Logo";

type ExamPaper = {
  id: string;
  title: string;
  category: string | null;
  image_url: string;
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

export default function ExamsPage() {
  const [papers, setPapers] = useState<ExamPaper[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [needSql, setNeedSql] = useState(false);

  // 검색 / 필터
  const [q, setQ] = useState("");
  const [catFilter, setCatFilter] = useState("전체");

  // 업로드 폼
  const [adding, setAdding] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [cleanedDataUrl, setCleanedDataUrl] = useState<string | null>(null);
  const [useCleaned, setUseCleaned] = useState(true);
  const [cleaning, setCleaning] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
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
      // 표가 아직 없으면 안내
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
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
    setCleanedDataUrl(null);
    setUseCleaned(true);
    if (!title.trim()) setTitle(f.name.replace(/\.[^.]+$/, ""));
    e.target.value = "";
  }

  async function cleanImage() {
    if (!file) return;
    setCleaning(true);
    setError("");
    try {
      const { data, mimeType } = await fileToBase64(file);
      const res = await fetch("/api/clean-image", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ data, mimeType }) });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "처리 실패");
      setCleanedDataUrl(`data:${j.mimeType};base64,${j.image}`);
      setUseCleaned(true);
    } catch (e) {
      setError(`낙서 지우기 실패: ${e instanceof Error ? e.message : "오류"}`);
    } finally {
      setCleaning(false);
    }
  }

  function resetForm() {
    setFile(null);
    setPreviewUrl(null);
    setCleanedDataUrl(null);
    setUseCleaned(true);
    setTitle("");
    setCategory("");
    setAdding(false);
  }

  async function save() {
    setError("");
    if (!file) return setError("시험지 사진을 먼저 골라 주세요.");
    if (!title.trim()) return setError("제목을 입력해 주세요. (나중에 찾을 때 써요)");
    setBusy(true);
    try {
      setProgress("사진 올리는 중…");
      let blob: Blob = file;
      let ext = file.name.split(".").pop() || "jpg";
      if (useCleaned && cleanedDataUrl) {
        blob = await dataUrlToBlob(cleanedDataUrl);
        ext = "png";
      }
      const path = `exams/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from(PHOTO_BUCKET).upload(path, blob, { contentType: blob.type || "image/png" });
      if (upErr) throw new Error("사진 업로드 실패: " + upErr.message);
      const imageUrl = supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path).data.publicUrl;

      setProgress("저장 중…");
      const { error: insErr } = await supabase.from("exam_papers").insert({
        title: title.trim(),
        category: category.trim() || null,
        image_url: imageUrl,
      });
      if (insErr) {
        if (/exam_papers|relation|does not exist|column/.test(insErr.message || "")) {
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

  const categories = ["전체", ...Array.from(new Set(papers.map((p) => p.category).filter(Boolean) as string[]))];
  const filtered = papers.filter(
    (p) =>
      (catFilter === "전체" || p.category === catFilter) &&
      (q === "" || p.title.toLowerCase().includes(q.toLowerCase()) || (p.category ?? "").toLowerCase().includes(q.toLowerCase())),
  );

  const shownImg = useCleaned && cleanedDataUrl ? cleanedDataUrl : previewUrl;

  return (
    <>
      <div className="no-print">
        <PageHeader
          eyebrow="기출 보관함"
          title="기출 시험지"
          sub="기출·시험지 사진을 올려 낙서를 지우고, 깨끗한 시험지로 모아두세요. 제목·분류로 나중에 쉽게 찾아 다시 풀릴 수 있어요."
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
  created_at timestamptz not null default now()
);
alter table exam_papers enable row level security;
drop policy if exists "allow all - exam_papers" on exam_papers;
create policy "allow all - exam_papers" on exam_papers for all using (true) with check (true);`}</pre>
          </div>
        )}

        {adding && (
          <div className="card" style={{ padding: 20, marginBottom: 16, maxWidth: 620 }}>
            {!previewUrl ? (
              <label className="upload-area" style={{ width: "100%" }}>
                <span style={{ color: "var(--muted)", marginBottom: 8 }}><IconCamera size={34} /></span>
                <span style={{ fontWeight: 700, fontSize: 15 }}>기출/시험지 사진 고르기</span>
                <span className="muted" style={{ fontSize: 13, marginTop: 4 }}>사진 한 장을 올려요</span>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={onPickFile} style={{ display: "none" }} />
              </label>
            ) : (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={shownImg ?? undefined} alt="미리보기" style={{ width: "100%", maxHeight: 360, objectFit: "contain", borderRadius: 10, background: "var(--bg-soft)" }} />
                <div className="row" style={{ gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => fileInputRef.current?.click()}>🖼 다른 사진</button>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={cleanImage} disabled={cleaning}>{cleaning ? "AI 지우는 중…" : "🤖 AI 낙서 지우기"}</button>
                  {cleanedDataUrl && (
                    <label className="row" style={{ gap: 6, fontSize: 13, cursor: "pointer", fontWeight: 600 }}>
                      <input type="checkbox" checked={useCleaned} onChange={(e) => setUseCleaned(e.target.checked)} />
                      낙서 지운 버전 사용
                    </label>
                  )}
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={onPickFile} style={{ display: "none" }} />
                </div>

                <div className="field" style={{ marginTop: 16 }}>
                  <label className="label">제목</label>
                  <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="예: 2024 중3 1학기 기말 수학" />
                </div>
                <div className="field">
                  <label className="label">분류 (선택 — 학년·학교·단원 등 나중에 찾기 쉽게)</label>
                  <input className="input" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="예: 중3 / 함수 / ○○중학교" list="exam-cats" />
                  <datalist id="exam-cats">
                    {categories.filter((c) => c !== "전체").map((c) => <option key={c} value={c} />)}
                  </datalist>
                </div>

                <div className="row" style={{ gap: 8, marginTop: 8 }}>
                  <button className="btn btn-primary" onClick={save} disabled={busy}>{busy ? progress || "저장 중…" : "📥 보관함에 저장"}</button>
                  <button className="btn btn-secondary" onClick={resetForm} disabled={busy}>취소</button>
                </div>
              </>
            )}
          </div>
        )}

        {/* 검색 / 분류 필터 */}
        {papers.length > 0 && (
          <div className="row" style={{ gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
            <div className="row" style={{ flex: 1, minWidth: 200, background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 10, padding: "0 12px", gap: 6 }}>
              <IconSearch size={16} className="muted" />
              <input className="input" style={{ border: 0, padding: "10px 4px", fontSize: 15 }} placeholder="제목·분류로 검색" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            {categories.length > 1 && (
              <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
                {categories.map((c) => (
                  <button key={c} className={`btn btn-sm ${catFilter === c ? "btn-primary" : "btn-secondary"}`} onClick={() => setCatFilter(c)}>{c}</button>
                ))}
              </div>
            )}
          </div>
        )}

        {loading ? (
          <div className="alert alert-info">불러오는 중…</div>
        ) : papers.length === 0 ? (
          <div className="empty card flat"><h4>아직 모아둔 기출 시험지가 없어요</h4>위 「시험지 올리기」로 기출·시험지 사진을 올려 보세요.</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12 }}>
            {filtered.map((p) => (
              <div key={p.id} className="card" style={{ padding: 10, cursor: "pointer" }} onClick={() => setViewing(p)}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.image_url} alt={p.title} style={{ width: "100%", height: 150, objectFit: "cover", borderRadius: 8, background: "var(--bg-soft)" }} />
                <div style={{ fontWeight: 700, fontSize: 14, marginTop: 8, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.title}</div>
                <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>{p.category ? `${p.category} · ` : ""}{ymd(p.created_at)}</div>
              </div>
            ))}
            {filtered.length === 0 && <div className="empty card flat" style={{ gridColumn: "1 / -1" }}><h4>검색 결과가 없어요</h4></div>}
          </div>
        )}
      </div>

      {/* 크게 보기 + 인쇄 */}
      {viewing && (
        <div className="no-print" onClick={() => setViewing(null)} style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(15,23,42,0.8)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div className="card" style={{ padding: 16, maxWidth: 720, width: "100%", maxHeight: "94vh", overflow: "auto" }} onClick={(e) => e.stopPropagation()}>
            <div className="row" style={{ justifyContent: "space-between", marginBottom: 10, gap: 8, flexWrap: "wrap" }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: 16 }}>{viewing.title}</div>
                <div className="muted" style={{ fontSize: 12 }}>{viewing.category ? `${viewing.category} · ` : ""}{ymd(viewing.created_at)}</div>
              </div>
              <div className="row" style={{ gap: 6 }}>
                <button className="btn btn-primary btn-sm" onClick={() => window.print()}>🖨️ 인쇄 / PDF</button>
                <button className="btn btn-ghost btn-sm" style={{ color: "var(--danger-ink)" }} onClick={() => remove(viewing)}>삭제</button>
                <button className="btn btn-secondary btn-sm" onClick={() => setViewing(null)}>닫기</button>
              </div>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={viewing.image_url} alt={viewing.title} style={{ width: "100%", borderRadius: 8, background: "var(--bg-soft)" }} />
          </div>
        </div>
      )}

      {/* 인쇄 전용 — 골라본 시험지를 A4로 깔끔하게 출력 */}
      {viewing && (
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
