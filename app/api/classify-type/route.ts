// 문제 사진을 보고 '오답 유형'을 유형표에서 골라주는 서버 기능 (Claude Haiku 사용)
// - 모델: claude-haiku-4-5 (가장 저렴)
// - 전체 유형표(285개)를 '프롬프트 캐싱'으로 매번 재사용해 비용을 줄임
// - 비밀키 ANTHROPIC_API_KEY 는 서버에서만 읽으므로 브라우저/코드에 노출되지 않음

import Anthropic from "@anthropic-ai/sdk";
import { supabase } from "@/lib/supabase";
import { MATH_TYPES } from "@/lib/mathTypes";

export const runtime = "nodejs";
export const maxDuration = 30;

const MODEL = "claude-haiku-4-5";

// 전체 유형표를 한 번만 텍스트로 만들어 둠 (모든 호출에서 동일 → 캐시 적중)
const TABLE_TEXT =
  "[유형표] (코드 | 유형명 | 예시·키워드)\n" +
  MATH_TYPES.map((t) => `${t.code} | ${t.name}${t.keywords ? ` | ${t.keywords}` : ""}`).join("\n");

const RULES = [
  "너는 수학 오답 문제의 유형을 분류하는 도우미다.",
  "[입력] 학생이 틀린 문제 사진 1장",
  "[참고] 아래 유형표 (해당 학년·학기)",
  "[규칙]",
  "1. 사진 속 문제가 어떤 유형인지, 아래 유형표에서 가장 가까운 것 하나를 고른다.",
  "2. 반드시 유형표 안의 코드 중에서만 고른다. 목록에 없는 유형을 새로 만들지 않는다.",
  '3. 사진이 흐리거나 판단이 애매하면 confidence를 "낮음"으로 표시한다.',
  "4. 한 사진에 문제가 여러 개면 문제마다 각각 분류한다.",
  "5. 결과만 아래 JSON 형식으로 출력한다. 다른 설명은 쓰지 않는다.",
  "[출력 형식]",
  '문제마다 { "유형코드": "", "유형명": "", "confidence": "높음|보통|낮음" } 를 만들어 JSON 배열로 출력한다.',
].join("\n");

type MediaType = "image/jpeg" | "image/png" | "image/gif" | "image/webp";
function mediaType(m?: string): MediaType {
  if (m === "image/png" || m === "image/gif" || m === "image/webp") return m;
  return "image/jpeg";
}

export async function POST(req: Request) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return Response.json(
      { error: "AI 키가 아직 없어요. Vercel 환경변수에 ANTHROPIC_API_KEY를 추가해 주세요." },
      { status: 400 },
    );
  }

  try {
    const { data, mimeType, prefix, label } = await req.json();
    if (!data) return Response.json({ error: "이미지 데이터가 비어 있어요." }, { status: 400 });
    if (!prefix) return Response.json({ error: "학년·학기 정보가 없어요." }, { status: 400 });

    const userText = [
      `이 문제는 ${label || prefix} 과정입니다. (학생이 선행 중일 수 있습니다)`,
      `반드시 유형코드가 "${prefix}-"로 시작하는 유형들 중에서만 고르세요.`,
      "사진 속 각 문제를 분류해, 위 [출력 형식]대로 JSON 배열로만 답하세요.",
    ].join("\n");

    const client = new Anthropic({ apiKey: key });
    const msg = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: [
        { type: "text", text: RULES },
        // 전체 유형표는 매 호출 동일 → 캐싱(요금 절감)
        { type: "text", text: TABLE_TEXT, cache_control: { type: "ephemeral" } },
      ],
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType(mimeType), data } },
            { type: "text", text: userText },
          ],
        },
      ],
    });

    const text = msg.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");

    // JSON 배열(또는 단일 객체)만 뽑아 파싱
    let results: { 유형코드?: string; 유형명?: string; confidence?: string }[] = [];
    const arr = text.match(/\[[\s\S]*\]/);
    const obj = text.match(/\{[\s\S]*\}/);
    try {
      if (arr) results = JSON.parse(arr[0]);
      else if (obj) results = [JSON.parse(obj[0])];
    } catch {
      /* 파싱 실패 → 빈 결과 */
    }

    // 유형표에 실제로 있는 코드만 남김 (헛것 방지)
    const valid = new Set(MATH_TYPES.map((t) => t.code));
    results = results.filter((r) => r.유형코드 && valid.has(r.유형코드));

    // 사용 기록 (요금 보기용)
    try {
      await supabase.from("ai_usage").insert({ kind: "type" });
    } catch {
      /* 무시 */
    }

    return Response.json({
      results: results.map((r) => ({ code: r.유형코드, name: r.유형명, confidence: r.confidence || "보통" })),
    });
  } catch (e) {
    const m = e instanceof Error ? e.message : "알 수 없는 오류가 났어요.";
    return Response.json({ error: m }, { status: 500 });
  }
}
