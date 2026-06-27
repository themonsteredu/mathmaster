"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { PageHeader, StatCard, SectionH } from "@/components/ui";

// 추정 단가 (원). 환율·정책에 따라 달라질 수 있어 '추정치'입니다.
const COST = { clean: 55, unit: 0.3 };

type Row = { kind: string; created_at: string };

export default function UsagePage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    supabase.from("ai_usage").select("kind, created_at").then(({ data, error }) => {
      if (error) setError(error.message);
      else setRows((data as Row[]) ?? []);
      setLoading(false);
    });
  }, []);

  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const thisMonth = rows.filter((r) => r.created_at >= monthStart);

  const count = (list: Row[], kind: string) => list.filter((r) => r.kind === kind).length;
  const won = (n: number) => `${Math.round(n).toLocaleString()}원`;

  const mClean = count(thisMonth, "clean");
  const mUnit = count(thisMonth, "unit");
  const mCost = mClean * COST.clean + mUnit * COST.unit;

  const tClean = count(rows, "clean");
  const tUnit = count(rows, "unit");
  const tCost = tClean * COST.clean + tUnit * COST.unit;

  // 월별 집계
  const byMonth = new Map<string, { clean: number; unit: number }>();
  rows.forEach((r) => {
    const m = r.created_at.slice(0, 7);
    const cur = byMonth.get(m) ?? { clean: 0, unit: 0 };
    if (r.kind === "clean") cur.clean++;
    else if (r.kind === "unit") cur.unit++;
    byMonth.set(m, cur);
  });
  const months = Array.from(byMonth.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1));

  return (
    <>
      <PageHeader eyebrow="계정" title="API 사용량" sub="AI 기능(낙서 지우기·단원 인식) 호출 횟수와 예상 비용이에요." />

      {error && (
        <div className="alert alert-err">
          사용 기록 표가 아직 없어요. Supabase에서 안내된 SQL(ai_usage)을 실행해 주세요.
        </div>
      )}

      <SectionH title="이번 달" />
      <div className="grid grid-3">
        <StatCard label="낙서 지우기" value={mClean} unit="회" hint={`약 ${won(mClean * COST.clean)}`} />
        <StatCard label="단원 인식" value={mUnit} unit="회" hint={`약 ${won(mUnit * COST.unit)}`} />
        <StatCard label="이번 달 예상" value={won(mCost)} />
      </div>

      <SectionH title="전체 누적" />
      <div className="grid grid-3">
        <StatCard label="낙서 지우기" value={tClean} unit="회" hint={`약 ${won(tClean * COST.clean)}`} />
        <StatCard label="단원 인식" value={tUnit} unit="회" hint={`약 ${won(tUnit * COST.unit)}`} />
        <StatCard label="전체 예상" value={won(tCost)} />
      </div>

      {months.length > 0 && (
        <>
          <SectionH title="월별 내역" />
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <table className="table">
              <thead>
                <tr><th>월</th><th>낙서 지우기</th><th>단원 인식</th><th>예상 비용</th></tr>
              </thead>
              <tbody>
                {months.map(([m, c]) => (
                  <tr key={m}>
                    <td style={{ fontWeight: 700 }}>{m.replace("-", ".")}</td>
                    <td><span className="num">{c.clean}</span>회</td>
                    <td><span className="num">{c.unit}</span>회</td>
                    <td><span className="num">{won(c.clean * COST.clean + c.unit * COST.unit)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {loading && <div className="alert alert-info" style={{ marginTop: 12 }}>불러오는 중…</div>}

      <div className="alert alert-info" style={{ marginTop: 18 }}>
        💡 위 금액은 <b>추정치</b>예요 (낙서 지우기 약 {COST.clean}원/회, 단원 인식 약 {COST.unit}원/회로 계산).
        실제 청구·무료 한도는 <b>Google AI Studio</b>에서 확인하세요. 무료 한도 안이면 0원일 수 있어요.
      </div>
    </>
  );
}
