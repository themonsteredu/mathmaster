import type { ReactNode } from "react";

/* 진행 점 — 반복 횟수 시각화 */
export function ProgressDots({
  total = 5,
  done = 0,
  current = false,
}: {
  total?: number;
  done?: number;
  current?: boolean;
}) {
  return (
    <span className="dots" aria-label={`${done}/${total}회 완료`}>
      {Array.from({ length: total }).map((_, i) => {
        const cls = i < done ? "filled" : i === done && current ? "partial" : "";
        return <span key={i} className={`d ${cls}`} />;
      })}
    </span>
  );
}

/* 상태 칩 */
export function StatusChip({ status }: { status: string }) {
  const map: Record<string, { cls: string; label: string }> = {
    study: { cls: "chip-study", label: "학습중" },
    done: { cls: "chip-done", label: "완료" },
    new: { cls: "chip-danger", label: "신규 오답" },
    review: { cls: "chip-accent", label: "새 풀이" },
  };
  const m = map[status] || { cls: "", label: status };
  return (
    <span className={`chip ${m.cls}`}>
      <span className="dot" />
      {m.label}
    </span>
  );
}

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i);
  return h;
}

/* 아바타 — 이름 첫 글자 */
export function Avatar({ name = "?", size = "md" }: { name?: string; size?: "md" | "lg" }) {
  const tones = ["ink", "amber", "sage", "red"];
  const t = tones[Math.abs(hash(name)) % tones.length];
  return (
    <span className={`avatar ${size} ${t}`} aria-hidden="true">
      {name.charAt(0)}
    </span>
  );
}

/* 페이지 헤더 (에디토리얼) */
export function PageHeader({
  eyebrow,
  title,
  sub,
  actions,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  sub?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="page-header">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1 className="page-h1">
          <span className="accent-rule" />
          {title}
        </h1>
        {sub && <p className="page-sub">{sub}</p>}
      </div>
      {actions && <div className="actions">{actions}</div>}
    </div>
  );
}

/* 통계 카드 */
export function StatCard({
  label,
  value,
  unit,
  delta,
  deltaType,
  hint,
}: {
  label: string;
  value: ReactNode;
  unit?: string;
  delta?: string;
  deltaType?: "up" | "down";
  hint?: string;
}) {
  return (
    <div className="card">
      <div className="stat">
        <div className="stat-label">{label}</div>
        <div className="stat-value tnum">
          {value}
          {unit && <span className="unit">{unit}</span>}
        </div>
        {delta && <div className={`stat-delta ${deltaType || ""}`}>{delta}</div>}
        {hint && !delta && <div className="stat-delta">{hint}</div>}
      </div>
    </div>
  );
}

/* 섹션 헤더 */
export function SectionH({ title, right }: { title: ReactNode; right?: ReactNode }) {
  return (
    <div className="section-h">
      <h2>{title}</h2>
      {right && <div className="more">{right}</div>}
    </div>
  );
}
