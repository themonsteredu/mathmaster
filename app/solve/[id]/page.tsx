"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase, PHOTO_BUCKET } from "@/lib/supabase";
import { DBProblem, problemTitle, problemTopic, problemImage } from "@/lib/data";
import { PageHeader, ProgressDots } from "@/components/ui";
import { IconChevronLeft, IconUpload, IconCheck, IconBook } from "@/components/icons";

type SolutionLog = { id: string; problem_id: string; solution_image_url: string; solved_at: string };

export default function SolvePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const [loading, setLoading] = useState(true);
  const [p, setP] = useState<DBProblem | null>(null);
  const [logs, setLogs] = useState<SolutionLog[]>([]);
  const [showPrev, setShowPrev] = useState(false);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [doneScreen, setDoneScreen] = useState<{ newDone: number; completed: boolean } | null>(null);

  async function loadAll() {
    const [{ data: prob }, { data: ls }] = await Promise.all([
      supabase.from("wrong_problems").select("*").eq("id", id).limit(1),
      supabase.from("solution_logs").select("*").eq("problem_id", id).order("solved_at", { ascending: true }),
    ]);
    setP((prob?.[0] as DBProblem) ?? null);
    setLogs((ls as SolutionLog[]) ?? []);
    setLoading(false);
  }
  useEffect(() => {
    loadAll();
  }, [id]);

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setPreview(f ? URL.createObjectURL(f) : "");
  }

  async function submit() {
    if (!p || !file) return;
    setBusy(true);
    setError("");
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `solutions/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from(PHOTO_BUCKET).upload(path, file);
      if (upErr) throw new Error(upErr.message);
      const { data: pub } = supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path);

      const { error: logErr } = await supabase.from("solution_logs").insert({ problem_id: p.id, solution_image_url: pub.publicUrl });
      if (logErr) throw new Error(logErr.message);

      const newDone = p.done_count + 1;
      const completed = newDone >= p.target_count;
      const { error: updErr } = await supabase.from("wrong_problems").update({ done_count: newDone, status: completed ? "완료" : "학습중" }).eq("id", p.id);
      if (updErr) throw new Error(updErr.message);

      setDoneScreen({ newDone, completed });
    } catch (e) {
      setError(e instanceof Error ? e.message : "알 수 없는 오류가 났어요.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <div className="alert alert-info">불러오는 중…</div>;
  if (!p)
    return (
      <>
        <PageHeader title="문제를 찾을 수 없습니다" />
        <button className="btn btn-secondary" onClick={() => router.push("/box")}><IconChevronLeft size={14} />오답함</button>
      </>
    );

  // 제출 완료(응원) 화면
  if (doneScreen) {
    const { newDone, completed } = doneScreen;
    return (
      <div className="card" style={{ padding: 40, textAlign: "center", maxWidth: 480, margin: "10px auto" }}>
        <div style={{ width: 72, height: 72, margin: "0 auto 18px", borderRadius: "50%", background: "var(--done-soft)", color: "var(--done-ink)", display: "grid", placeItems: "center" }}>
          <IconCheck size={36} />
        </div>
        <h2 style={{ fontFamily: "var(--font-serif)", fontSize: 24, marginBottom: 8 }}>
          {completed ? "🎉 모두 완료했어요!" : "잘했어요!"}
        </h2>
        <p className="muted" style={{ marginBottom: 6 }}>
          {completed ? `${p.target_count}회 반복을 끝냈어요. 정말 수고했어요.` : `이번 풀이가 인정됐어요.`}
        </p>
        <div className="row" style={{ justifyContent: "center", gap: 8, margin: "16px 0 22px" }}>
          <ProgressDots total={p.target_count} done={newDone} />
          <span className="num">{newDone}/{p.target_count}회</span>
        </div>
        <div className="row" style={{ gap: 8, justifyContent: "center" }}>
          {!completed && (
            <button className="btn btn-secondary" onClick={() => { setDoneScreen(null); setFile(null); setPreview(""); setP({ ...p, done_count: newDone }); loadAll(); }}>
              한 번 더 풀기
            </button>
          )}
          <button className="btn btn-primary" onClick={() => router.push("/box")}>오답함으로</button>
        </div>
      </div>
    );
  }

  const remaining = Math.max(0, p.target_count - p.done_count);

  return (
    <>
      <button className="btn btn-ghost btn-sm" style={{ marginBottom: 12, paddingLeft: 0 }} onClick={() => router.push("/box")}>
        <IconChevronLeft size={14} />오답함
      </button>

      <PageHeader eyebrow={`${p.done_count + 1}회차 풀이 · 목표 ${p.target_count}회`} title={problemTitle(p)} sub={`${p.student_name} · ${problemTopic(p)}`} />

      {/* 진행 카드 */}
      <div className="card" style={{ padding: 16, marginBottom: 14 }}>
        <div className="row-between" style={{ gap: 12, flexWrap: "wrap" }}>
          <div className="row" style={{ gap: 12 }}>
            <ProgressDots total={p.target_count} done={p.done_count} current />
            <div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>지금은 {p.done_count + 1}번째 풀이</div>
              <div className="muted" style={{ fontSize: 12 }}>이전 풀이 {p.done_count}회 · 남은 회차 {remaining}회</div>
            </div>
          </div>
          {logs.length > 0 && (
            <button className="btn btn-ghost btn-sm" onClick={() => setShowPrev((v) => !v)}>
              <IconBook size={14} />이전 풀이 {showPrev ? "닫기" : "보기"}
            </button>
          )}
        </div>
        {showPrev && logs.length > 0 && (
          <div className="row" style={{ gap: 10, flexWrap: "wrap", marginTop: 12 }}>
            {logs.map((l, i) => (
              <a key={l.id} href={l.solution_image_url} target="_blank" rel="noreferrer" style={{ position: "relative" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={l.solution_image_url} alt={`${i + 1}회`} style={{ width: 84, height: 84, objectFit: "cover", borderRadius: 10, border: "1px solid var(--line)" }} />
                <span style={{ position: "absolute", bottom: 4, left: 4, background: "rgba(28,26,23,0.75)", color: "#fff", fontSize: 11, fontWeight: 700, padding: "1px 6px", borderRadius: 6 }}>{i + 1}회</span>
              </a>
            ))}
          </div>
        )}
      </div>

      {/* 문제 사진 */}
      <div className="card" style={{ padding: 16, marginBottom: 14 }}>
        <span className="label">문제</span>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={problemImage(p)} alt="문제" style={{ width: "100%", maxHeight: 420, objectFit: "contain", borderRadius: 10, background: "var(--bg-soft)" }} />
      </div>

      {/* 풀이 올리기 */}
      <div className="card" style={{ padding: 16 }}>
        <span className="label">내 풀이 사진</span>
        <label className="upload-area" style={{ width: "100%", padding: 0, overflow: "hidden" }}>
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="풀이 미리보기" style={{ width: "100%", maxHeight: 320, objectFit: "contain" }} />
          ) : (
            <>
              <span style={{ color: "var(--muted)", marginBottom: 8 }}><IconUpload size={32} /></span>
              <span style={{ fontWeight: 700, fontSize: 15 }}>풀이 사진 찍기 / 올리기</span>
              <span className="muted" style={{ fontSize: 13, marginTop: 4 }}>직접 푼 풀이를 사진으로 찍어주세요</span>
            </>
          )}
          <input type="file" accept="image/*" onChange={onPick} style={{ display: "none" }} />
        </label>

        {error && <div className="alert alert-err" style={{ marginTop: 12, marginBottom: 0 }}>❌ {error}</div>}

        <button className="btn btn-primary btn-lg btn-block" style={{ marginTop: 14 }} onClick={submit} disabled={busy || !file}>
          {busy ? "제출 중…" : "✏️ 풀이 제출하기"}
        </button>
      </div>
    </>
  );
}
