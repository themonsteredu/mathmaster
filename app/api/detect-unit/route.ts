// 문제 사진을 보고 '단원명'을 짧게 추천하는 서버 기능 (Gemini 텍스트+비전 모델)
// 글자 몇 개만 출력하므로 낙서 지우기보다 훨씬 저렴합니다.

import { supabase } from "@/lib/supabase";

export const runtime = "nodejs";
export const maxDuration = 30;

const MODEL = "gemini-2.5-flash";

async function logUsage(kind: string) {
  try {
    await supabase.from("ai_usage").insert({ kind });
  } catch {
    /* 무시 */
  }
}

const PROMPT = [
  "이것은 한국 중·고등학교 수학 문제 사진이야.",
  "이 문제의 '단원명'을 한국어로 아주 짧게 한 개만 답해.",
  "예: 이차방정식, 삼각비, 지수와 로그, 함수의 극한, 수열, 확률.",
  "설명이나 다른 말 없이 단원명만 출력해.",
].join(" ");

export async function POST(req: Request) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    return Response.json({ error: "AI 키가 설정되지 않았어요. Vercel 환경변수 GEMINI_API_KEY를 확인해 주세요." }, { status: 400 });
  }
  try {
    const { data, mimeType } = await req.json();
    if (!data) return Response.json({ error: "이미지 데이터가 비어 있어요." }, { status: 400 });

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`;
    const body = {
      contents: [
        { role: "user", parts: [{ text: PROMPT }, { inline_data: { mime_type: mimeType || "image/jpeg", data } }] },
      ],
    };
    const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json();
    if (!r.ok) return Response.json({ error: j?.error?.message || "AI 처리 중 오류" }, { status: 502 });

    const parts = j?.candidates?.[0]?.content?.parts ?? [];
    const text = parts.map((p: { text?: string }) => p.text || "").join("").trim();
    const unit = text.split(/[\n.]/)[0].trim().slice(0, 30);
    if (!unit) return Response.json({ error: "단원을 알아내지 못했어요." }, { status: 502 });

    await logUsage("unit");
    return Response.json({ unit });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "알 수 없는 오류" }, { status: 500 });
  }
}
