// 문제 사진에서 학생 낙서를 지우는 서버 기능 (Google Gemini 이미지 모델 사용)
// 비밀 키(GEMINI_API_KEY)는 서버에서만 읽으므로 브라우저/코드에 노출되지 않습니다.

import { supabase } from "@/lib/supabase";

export const runtime = "nodejs";
export const maxDuration = 60;

const MODEL = "gemini-2.5-flash-image";

async function logUsage(kind: string) {
  try {
    await supabase.from("ai_usage").insert({ kind });
  } catch {
    /* 사용 기록 실패는 무시 */
  }
}

const PROMPT = [
  "You are a careful, CONSERVATIVE photo retoucher.",
  "This is a photo of a PRINTED math exam with a student's handwriting on it.",
  "Remove ONLY the student's handwritten additions: pencil/pen handwriting, scribbles,",
  "circles, underlines, check marks and drawn marks.",
  "CRITICAL: Preserve ALL printed content — every problem number, question text, number,",
  "fraction, equation, math symbol, figure, diagram, table and box. NEVER erase, blank out,",
  "white-out, or empty any region of the printed problems.",
  "If you are unsure whether something is printed or handwritten, KEEP IT.",
  "It is much better to leave a faint mark than to delete printed content.",
  "Do NOT change, add, move, crop, or rewrite anything. Keep the exact original layout,",
  "all printed text, and the paper background unchanged.",
  "Return only the cleaned image, same size and framing as the input.",
].join(" ");

export async function POST(req: Request) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    return Response.json(
      { error: "AI 키가 아직 설정되지 않았어요. Vercel 환경변수에 GEMINI_API_KEY를 추가해 주세요." },
      { status: 400 },
    );
  }

  try {
    const { data, mimeType } = await req.json();
    if (!data) return Response.json({ error: "이미지 데이터가 비어 있어요." }, { status: 400 });

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`;
    const body = {
      contents: [
        {
          role: "user",
          parts: [
            { text: PROMPT },
            { inline_data: { mime_type: mimeType || "image/jpeg", data } },
          ],
        },
      ],
    };

    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const j = await r.json();

    if (!r.ok) {
      const msg = j?.error?.message || "AI 처리 중 오류가 났어요.";
      return Response.json({ error: msg }, { status: 502 });
    }

    const parts = j?.candidates?.[0]?.content?.parts ?? [];
    const imgPart = parts.find((p: Record<string, unknown>) => p.inlineData || p.inline_data);
    const inline = (imgPart?.inlineData || imgPart?.inline_data) as { data?: string; mimeType?: string; mime_type?: string } | undefined;

    if (!inline?.data) {
      return Response.json(
        { error: "AI가 이미지를 만들지 못했어요. 사진을 더 또렷하게 찍어 다시 시도해 주세요." },
        { status: 502 },
      );
    }

    await logUsage("clean");
    return Response.json({ image: inline.data, mimeType: inline.mimeType || inline.mime_type || "image/png" });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "알 수 없는 오류가 났어요.";
    return Response.json({ error: msg }, { status: 500 });
  }
}
