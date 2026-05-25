import type { ReactNode } from "react";

export function TableWrap({ children }: { children: ReactNode }) {
  return (
    <div
      className="rounded-xl overflow-auto"
      style={{
        background: "var(--panel)",
        border: "1px solid var(--line)",
        maxHeight: "70vh",
      }}
    >
      {children}
    </div>
  );
}

export function Th({ children, num }: { children: ReactNode; num?: boolean }) {
  return (
    <th
      className="sticky top-0 z-10 px-3 py-2.5 text-xs uppercase tracking-wider font-medium whitespace-nowrap"
      style={{
        background: "var(--panel)",
        color: "var(--muted)",
        textAlign: num ? "right" : "left",
        letterSpacing: "0.06em",
        borderBottom: "1px solid var(--line)",
      }}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  num,
  muted,
  style,
}: {
  children: ReactNode;
  num?: boolean;
  muted?: boolean;
  style?: React.CSSProperties;
}) {
  return (
    <td
      className="px-3 py-2.5 text-sm whitespace-nowrap"
      style={{
        textAlign: num ? "right" : "left",
        color: muted ? "var(--muted)" : undefined,
        fontVariantNumeric: num ? "tabular-nums" : undefined,
        borderBottom: "1px solid var(--line)",
        ...style,
      }}
    >
      {children}
    </td>
  );
}

export function Pill({
  children,
  variant,
}: {
  children: ReactNode;
  variant?: "ok" | "warn" | "err";
}) {
  const bg =
    variant === "ok"
      ? "rgba(22, 163, 74, 0.12)"
      : variant === "warn"
        ? "rgba(217, 119, 6, 0.12)"
        : variant === "err"
          ? "rgba(220, 38, 38, 0.12)"
          : "var(--panel)";
  const color =
    variant === "ok"
      ? "var(--success)"
      : variant === "warn"
        ? "var(--warning)"
        : variant === "err"
          ? "var(--error)"
          : "var(--muted)";
  return (
    <span
      className="inline-block px-2 py-0.5 rounded-full text-xs"
      style={{ background: bg, color, border: "1px solid var(--line)" }}
    >
      {children}
    </span>
  );
}

export function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-xs hover:underline"
      style={{ color: "var(--accent)" }}
    >
      {children}
    </a>
  );
}
