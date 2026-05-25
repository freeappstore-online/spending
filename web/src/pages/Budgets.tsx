import { useState } from "react";
import type { DashboardData } from "../types";
import { Card, CardGrid } from "../components/Card";
import { TableWrap, Th, Td, Pill } from "../components/Table";
import { fmtMoney } from "../lib/fmt";

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

  const q = filter.toLowerCase();
  const rows = data.budgets
    .filter((b) => {
      if (!q) return true;
      const scope = b.projectNumbers.map((n) => data.projectNames[n] || n).join(" ");
      return (
        b.displayName.toLowerCase().includes(q) ||
        (b.billingAccountDisplayName || "").toLowerCase().includes(q) ||
        scope.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => (b.amount || 0) - (a.amount || 0));

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
      </CardGrid>

      <div className="mb-4">
        <input
          type="search"
          placeholder="Filter budgets by name, project, billing account..."
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
                  ? b.projectNumbers.map((n) => data.projectNames[n] || n).join(", ")
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
                <Td muted>No budgets found.</Td>
              </tr>
            )}
          </tbody>
        </table>
      </TableWrap>

      <p className="text-xs mt-4" style={{ color: "var(--muted)" }}>
        Uncovered projects (no budget) are listed in the Projects tab.
      </p>
    </div>
  );
}
