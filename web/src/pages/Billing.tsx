import type { DashboardData } from "../types";
import { Pill, ExternalLink } from "../components/Table";
import { fmtMoney } from "../lib/fmt";

interface Props {
  data: DashboardData;
}

export function Billing({ data }: Props) {
  if (data.billingAccounts.length === 0) {
    return (
      <div>
        <h1 className="text-2xl font-extrabold mb-4" style={{ fontFamily: "Fraunces, serif" }}>
          Billing accounts
        </h1>
        <p style={{ color: "var(--muted)" }}>No billing accounts readable.</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-extrabold mb-4" style={{ fontFamily: "Fraunces, serif" }}>
        Billing accounts
      </h1>

      {data.billingAccounts.map((ba) => {
        const budgetTotal = ba.budgets.reduce((sum, b) => sum + (b.amount || 0), 0);
        const currency = ba.budgets[0]?.currency || "";

        return (
          <div
            key={ba.id}
            className="rounded-xl p-5 mb-4"
            style={{ background: "var(--panel)", border: "1px solid var(--line)" }}
          >
            <div className="flex justify-between items-center flex-wrap gap-2 mb-2">
              <h3 className="font-semibold text-base">{ba.displayName}</h3>
              <div className="flex gap-2 items-center">
                <Pill variant={ba.open ? "ok" : "err"}>
                  {ba.open ? "open" : "closed"}
                </Pill>
                <ExternalLink href={`https://console.cloud.google.com/billing/${ba.id}/export`}>
                  BQ export
                </ExternalLink>
              </div>
            </div>
            <div className="text-xs mb-4" style={{ color: "var(--muted)" }}>
              <code>{ba.id}</code>
            </div>

            <div className="text-sm mb-2">
              <strong>{ba.linkedProjects.length}</strong> linked project{ba.linkedProjects.length === 1 ? "" : "s"}
            </div>
            {ba.linkedProjects.length > 0 && (
              <details className="text-sm mb-4">
                <summary className="cursor-pointer text-xs" style={{ color: "var(--accent)" }}>
                  show projects
                </summary>
                <ul className="mt-2 ml-4 list-disc">
                  {ba.linkedProjects.map((lp) => (
                    <li key={lp.projectId} className="text-xs mb-1">
                      <code>{lp.projectId}</code>
                      {!lp.billingEnabled && (
                        <Pill variant="warn">disabled</Pill>
                      )}
                    </li>
                  ))}
                </ul>
              </details>
            )}

            <div className="text-sm mb-2">
              <strong>{ba.budgets.length}</strong> budget{ba.budgets.length === 1 ? "" : "s"}
              {currency && (
                <span className="ml-2" style={{ color: "var(--muted)" }}>
                  total {fmtMoney(budgetTotal)} {currency}/mo
                </span>
              )}
            </div>
            {ba.budgets.length > 0 && (
              <div className="flex flex-col gap-2 mt-2">
                {ba.budgets.map((b, i) => (
                  <BudgetItem key={i} budget={b} projectNames={data.projectNames} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function BudgetItem({
  budget,
  projectNames,
}: {
  budget: DashboardData["budgets"][0];
  projectNames: Record<string, string>;
}) {
  const scope =
    budget.projectNumbers.length > 0
      ? budget.projectNumbers.map((n) => projectNames[n] || n).join(", ")
      : "whole billing account";
  const thresholds = budget.thresholds.map((t) => `${Math.round(t.percent)}%`).join(" / ");
  const amt = budget.amount != null ? `${fmtMoney(budget.amount)} ${budget.currency}` : "--";

  return (
    <div
      className="rounded-lg p-3 text-sm"
      style={{ background: "var(--paper)", border: "1px solid var(--line)" }}
    >
      <div className="flex justify-between items-baseline gap-3">
        <span className="font-medium">{budget.displayName}</span>
        <span style={{ color: "var(--success)", fontVariantNumeric: "tabular-nums" }}>
          {amt} / {budget.period}
        </span>
      </div>
      <div className="text-xs mt-1" style={{ color: "var(--muted)" }}>
        scope: {scope}
        {thresholds && <span> / thresholds {thresholds}</span>}
      </div>
    </div>
  );
}
