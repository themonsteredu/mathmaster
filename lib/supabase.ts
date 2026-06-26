import { createClient } from "@supabase/supabase-js";

// Supabase(데이터+사진 창고) 연결 정보
// anon 키는 브라우저에 공개되어도 되는 "공개 열쇠"라 여기에 넣어도 안전합니다.
const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  "https://xgvfpgkyafmrkarzxwpn.supabase.co";

const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhndmZwZ2t5YWZtcmthcnp4d3BuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI0NTc0NjMsImV4cCI6MjA5ODAzMzQ2M30.lhW_c_OHqIDlt7YRHnJyBvml2ZgsRh9OP62cxkARcmU";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 사진을 보관하는 보관함(버킷) 이름
export const PHOTO_BUCKET = "problem-photos";
