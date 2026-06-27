"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase, PHOTO_BUCKET } from "@/lib/supabase";
import { getStudent } from "@/lib/student";
import { DBProblem, problemImage } from "@/lib/data";
import { PageHeader } from "@/components/ui";
import { IconChevronLeft, IconUpload, IconCheck } from "@/components/icons";

export default function StudentSolve() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const [p, setP] = useState<DBProblem | null>(null);
  const [loading, setLoading] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!getStudent()) {
      router.replace("/student");
      return;
    }
    supabase.from("wrong_problems").select("*").eq("id", id).limit(1).then(({ data }) => {
      setP((data?.[0] as DBProblem) ?? null);
      setLoading(false);
    });
  }, [id, router]);

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

      // 선생님이 새 풀이를 알 수 있게 제출 시각 기록 (칸 없으면 조용히 넘어감)
      await supabase.from("wrong_problems").update({ last_submitted_at: new Date().toISOString() }).eq("id", p.id);

      setDone(true);
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
        <PageHeader title="문제를 찾을 수 없어요" />
        <button className="btn btn-secondary" onClick={() => router.push("/student/box")}><IconChevronLeft size={14} />오답함</button>
      </>
    );

  if (done) {
    return (
      <div className="card" style={{ padding: 40, textAlign: "center", maxWidth: 460, margin: "10px auto" }}>
        <div style={{ width: 72, height: 72, margin: "0 auto 18px", borderRadius: "50%", background: "var(--done-soft)", color: "var(--done-ink)", display: "grid", placeItems: "center" }}>
          <IconCheck size={36} />
        </div>
        <h2 style={{ fontFamily: "var(--font-serif)", fontSize: 24, marginBottom: 8 }}>제출 완료!</h2>
        <p className="muted" style={{ marginBottom: 22 }}>선생님이 확인하고 다음 단계를 정해줄 거예요.</p>
        <button className="btn btn-primary" onClick={() => router.push("/student/box")}>오답함으로</button>
      </div>
    );
  }

  return (
    <>
      <button className="btn btn-ghost btn-sm" style={{ marginBottom: 12, paddingLeft: 0 }} onClick={() => router.push("/student/box")}>
        <IconChevronLeft size={14} />오답함
      </button>
      <PageHeader title={p.seq != null ? `${p.seq}번 문제` : "오답 문제"} sub="문제를 풀고, 푼 과정을 사진으로 올려요." />

      <div className="card" style={{ padding: 16, marginBottom: 14 }}>
        <span className="label">문제</span>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={problemImage(p)} alt="문제" style={{ width: "100%", maxHeight: 420, objectFit: "contain", borderRadius: 10, background: "var(--bg-soft)" }} />
      </div>

      <div className="card" style={{ padding: 16 }}>
        <span className="label">내 풀이 사진</span>
        <label className="upload-area" style={{ width: "100%", padding: 0, overflow: "hidden" }}>
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="풀이" style={{ width: "100%", maxHeight: 320, objectFit: "contain" }} />
          ) : (
            <>
              <span style={{ color: "var(--muted)", marginBottom: 8 }}><IconUpload size={32} /></span>
              <span style={{ fontWeight: 700, fontSize: 15 }}>풀이 사진 찍기 / 올리기</span>
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
