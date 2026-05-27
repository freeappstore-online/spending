import { useState } from "react";
import type { DashboardData } from "../types";
import { Card, CardGrid } from "../components/Card";
import { TableWrap, Th, Td, Pill } from "../components/Table";
import { fmtMoney } from "../lib/fmt";
import { aggregateSpend, computeBudgetActuals, type BudgetActual } from "../lib/spend";

interface Props {
  data: DashboardData;
}

export function Budgets({ data }: Props) {
  const [filter, setFilter] = useState("");

  const totals: Record<string, number> = {};
  for (const b of data.budgets) {
    if (b.amount == null || !b.currency) continue;
    totals[b.currency] = (totals[b.currency] || 0) + b.amount;
  }

  const agg = data.spend.results.length > 0 ? aggregateSpend(data.spend.results) : null;
  const actuals = agg ? computeBudgetActuals(data.budgets, agg, data.projectNumberToId) : [];

  const q = filter.toLowerCase();
  const rows = data.budgets
    .filter((b) => {
      if (!q) return true;
      const scope = b.projectNumbers.map((n) => data.projectNumberToName[n] || n).join(" ");
      return (
        b.displayName.toLowerCase().includes(q) ||
        (b.billingAccountDisplayName || "").toLowerCase().includes(q) ||
        scope.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => (b.amount ?? -1) - (a.amount ?? -1));

  return (
    <div>
      <h1 className="text-2xl font-extrabold mb-4" style={{ fontFamily: "Fraunces, serif" }}>
        Budgets
      </h1>

      <CardGrid>
        {Object.entries(totals).map(([ccy, amt]) => (
          <Card key={ccy} label={`Total / mo (${ccy})`} value={fmtMoney(amt)} />
        ))}
        <Card label="Budgets set" value={data.budgets.length} />
        <Card
          label="Uncovered projects"
          value={data.budgetCoverage.uncoveredCount}
          warn={data.budgetCoverage.uncoveredCount > 0}
        />
        {actuals.length > 0 && (
          <Card
            label="Over budget"
            value={actuals.filter((a) => a.status === "over").length}
            warn={actuals.some((a) => a.status === "over")}
          />
        )}
      </CardGrid>

      {/* Budget vs actual */}
      {actuals.length > 0 && (
        <BudgetActualSection actuals={actuals} />
      )}

      <h3
        className="text-xs uppercase tracking-wider font-medium mt-8 mb-3"
        style={{ color: "var(--muted)", letterSpacing: "0.08em" }}
      >
        All budgets
      </h3>
      <div className="mb-4">
        <input
          type="search"
          placeholder="Filter budgets..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-full max-w-md px-3 py-2 rounded-lg text-sm"
          style={{
            background: "var(--panel)",
            border: "1px solid var(--line)",
            color: "var(--ink)",
            outline: "none",
          }}
        />
      </div>

      <TableWrap>
        <table className="w-full" style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <Th>Budget</Th>
              <Th>Billing account</Th>
              <Th num>Amount / period</Th>
              <Th>Scope</Th>
              <Th>Thresholds</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((b, i) => {
              const scope =
                b.projectNumbers.length > 0
                  ? b.projectNumbers.map((n) => data.projectNumberToName[n] || n).join(", ")
                  : "whole billing account";
              const amt = b.amount != null ? `${fmtMoney(b.amount)} ${b.currency}` : "--";
              return (
                <tr key={i}>
                  <Td>{b.displayName}</Td>
                  <Td muted>{b.billingAccountDisplayName}</Td>
                  <Td num>{amt} / {b.period}</Td>
                  <Td>
                    <span className="text-xs" style={{ color: b.projectNumbers.length > 0 ? undefined : "var(--muted)" }}>
                      {scope}
                    </span>
                  </Td>
                  <Td>
                    <div className="flex gap-1 flex-wrap">
                      {b.thresholds.map((t, ti) => (
                        <Pill key={ti}>{Math.round(t.percent)}%</Pill>
                      ))}
                      {b.thresholds.length === 0 && (
                        <span className="text-xs" style={{ color: "var(--muted)" }}>none</span>
                      )}
                    </div>
                  </Td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <Td muted colSpan={5}>No budgets found.</Td>
              </tr>
            )}
          </tbody>
        </table>
      </TableWrap>
    </div>
  );
}

function BudgetActualSection({ actuals }: { actuals: BudgetActual[] }) {
  return (
    <>
      <h3
        className="text-xs uppercase tracking-wider font-medium mb-3 mt-2"
        style={{ color: "var(--muted)", letterSpacing: "0.08em" }}
      >
        Budget vs actual — this month
      </h3>
      <div className="grid gap-3 mb-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))" }}>
        {actuals.map((a, i) => (
          <BudgetActualCard key={i} a={a} />
        ))}
      </div>
    </>
  );
}

function BudgetActualCard({ a }: { a: BudgetActual }) {
  const barColor =
    a.status === "over" ? "var(--error)" :
    a.status === "warn" ? "var(--warning)" :
    "var(--success)";
  const remaining = a.amount - a.actualSpend;
  return (
    <div
      className="rounded-xl p-4"
      style={{
        background: "var(--panel)",
        border: "1px solid var(--line)",
        borderLeftWidth: 4,
        borderLeftColor: barColor,
      }}
    >
      <div className="flex justify-between items-baseline mb-2 gap-2 flex-wrap">
        <div className="font-medium text-sm">{a.displayName}</div>
        <div className="text-xs" style={{ color: "var(--muted)" }}>
          {a.scope.length > 40 ? a.scope.slice(0, 38) + "..." : a.scope}
        </div>
      </div>
      <div className="flex justify-between items-baseline mb-2 tabular-nums">
        <span style={{ color: barColor, fontWeight: 600 }}>
          ${fmtMoney(a.actualSpend)} {a.currency}
        </span>
        <span className="text-sm" style={{ color: "var(--muted)" }}>
          / ${fmtMoney(a.amount)}
        </span>
      </div>
      <div
        className="h-2 rounded-full overflow-hidden mb-1"
        style={{ background: "var(--line)" }}
      >
        <div
          style={{
            width: `${Math.min(100, a.percentUsed)}%`,
            height: "100%",
            background: barColor,
            transition: "width 0.3s",
          }}
        />
      </div>
      <div className="flex justify-between text-xs" style={{ color: "var(--muted)" }}>
        <span>{a.percentUsed.toFixed(0)}% used</span>
        <span>
          {remaining >= 0
            ? `$${fmtMoney(remaining)} left`
            : `$${fmtMoney(-remaining)} over`}
        </span>
      </div>
    </div>
  );
}
