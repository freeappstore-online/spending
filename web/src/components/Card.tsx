import type { ReactNode } from "react";

interface CardProps {
  label: string;
  value: ReactNode;
  warn?: boolean;
  good?: boolean;
  sub?: string;
  small?: boolean;
}

export function Card({ label, value, warn, good, sub, small }: CardProps) {
  const color = warn ? "var(--warning)" : good ? "var(--success)" : undefined;
  return (
    <div
      className="rounded-xl p-4"
      style={{ background: "var(--panel)", border: "1px solid var(--line)" }}
    >
      <div
        className="text-xs uppercase tracking-wider font-medium mb-1"
        style={{ color: "var(--muted)", letterSpacing: "0.06em" }}
      >
        {label}
      </div>
      <div
        className={`font-semibold tabular-nums ${small ? "text-base" : "text-2xl"}`}
        style={{ color, fontVariantNumeric: "tabular-nums" }}
      >
        {value}
      </div>
      {sub && (
        <div className="text-xs mt-1" style={{ color: "var(--muted)", fontVariantNumeric: "tabular-nums" }}>
          {sub}
        </div>
      )}
    </div>
  );
}

export function CardGrid({ children }: { children: ReactNode }) {
  return (
    <div
      className="grid gap-3 mb-5"
      style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}
    >
      {children}
    </div>
  );
}
