import { useState } from "react";
import type { DashboardData, Issue } from "../types";
import { Card, CardGrid } from "../components/Card";
import { Pill, ExternalLink } from "../components/Table";
import { fmtMoney, pLabel } from "../lib/fmt";

interface Props {
  data: DashboardData;
}

const CATEGORY_LABELS: Record<string, string> = {
  stop_bleeding: "Stop bleeding",
  prevent_overspend: "Prevent overspend",
  cleanup: "Cleanup",
  governance: "Governance",
};

export function Issues({ data }: Props) {
  const [catFilter, setCatFilter] = useState("");
  const issues = data.issues;

  const filtered = catFilter
    ? issues.filter((i) => i.category === catFilter)
    : issues;

  const totalSavings = issues.reduce((s, i) => s + i.estimatedMonthlyCost, 0);
  const counts = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const i of issues)
    counts[i.severity] = (counts[i.severity] || 0) + 1;

  const catCounts: Record<string, number> = {};
  for (const i of issues) catCounts[i.category] = (catCounts[i.category] || 0) + 1;

  return (
    <div>
      <h1 className="text-2xl font-extrabold mb-1" style={{ fontFamily: "Fraunces, serif" }}>
        Cost optimization
      </h1>
      <p className="text-sm mb-6" style={{ color: "var(--muted)" }}>
        Auto-detected issues sorted by severity. Fix from top to bottom.
      </p>

      <CardGrid>
        {totalSavings > 0 && (
          <Card label="Potential savings / mo" value={`$${fmtMoney(totalSavings)}`} good />
        )}
        <Card label="Critical" value={counts.critical} warn={counts.critical > 0} />
        <Card label="High" value={counts.high} warn={counts.high > 0} />
        <Card label="Total issues" value={issues.length} />
        {Object.entries(catCounts).map(([cat, n]) => (
          <Card key={cat} label={CATEGORY_LABELS[cat] || cat} value={n} />
        ))}
      </CardGrid>

      <div className="mb-4">
        <select
          value={catFilter}
          onChange={(e) => setCatFilter(e.target.value)}
          className="px-3 py-2 rounded-lg text-sm"
          style={{
            background: "var(--panel)",
            border: "1px solid var(--line)",
            color: "var(--ink)",
          }}
        >
          <option value="">All categories</option>
          <option value="stop_bleeding">Stop bleeding</option>
          <option value="prevent_overspend">Prevent overspend</option>
          <option value="cleanup">Cleanup</option>
          <option value="governance">Governance</option>
        </select>
      </div>

      {filtered.length === 0 && (
        <p style={{ color: "var(--muted)" }}>No issues in this category.</p>
      )}

      <div className="flex flex-col gap-3">
        {filtered.map((issue, idx) => (
          <IssueCard key={idx} issue={issue} rank={idx + 1} projectNames={data.projectNames} />
        ))}
      </div>
    </div>
  );
}

const SEVERITY_VARIANT: Record<string, "err" | "warn" | undefined> = {
  critical: "err",
  high: "warn",
};

const SEVERITY_BORDER: Record<string, string> = {
  critical: "var(--error)",
  high: "var(--warning)",
  medium: "var(--accent)",
  low: "var(--muted)",
};

function IssueCard({
  issue,
  rank,
  projectNames,
}: {
  issue: Issue;
  rank: number;
  projectNames: Record<string, string>;
}) {
  return (
    <div
      className="rounded-xl p-4"
      style={{
        background: "var(--panel)",
        border: "1px solid var(--line)",
        borderLeftWidth: "4px",
        borderLeftColor: SEVERITY_BORDER[issue.severity] || "var(--line)",
      }}
    >
      <div className="flex items-center gap-2 flex-wrap mb-2">
        <span className="text-xs font-semibold" style={{ color: "var(--muted)" }}>
          #{rank}
        </span>
        <Pill variant={SEVERITY_VARIANT[issue.severity]}>
          {issue.severity}
        </Pill>
        <Pill>{CATEGORY_LABELS[issue.category] || issue.category}</Pill>
        {issue.estimatedMonthlyCost > 0 && (
          <span
            className="ml-auto text-sm font-semibold"
            style={{ color: "var(--success)", fontVariantNumeric: "tabular-nums" }}
          >
            {issue.verified ? "" : "~"}${fmtMoney(issue.estimatedMonthlyCost)}/mo
            {issue.verified && (
              <Pill variant="ok">verified</Pill>
            )}
          </span>
        )}
      </div>

      <div className="flex items-baseline gap-2 flex-wrap mb-1">
        <span className="font-medium text-sm">{issue.title}</span>
        {issue.projectId && (
          <span className="text-xs" style={{ color: "var(--muted)" }}>
            {pLabel(issue.projectId, projectNames)}
          </span>
        )}
      </div>

      <p className="text-sm mb-1" style={{ color: "var(--muted)", lineHeight: 1.5 }}>
        {issue.detail}
      </p>
      <p className="text-sm" style={{ lineHeight: 1.5 }}>
        <strong style={{ color: "var(--success)" }}>Fix:</strong> {issue.action}
      </p>

      {(issue.consoleUrl || issue.projectId) && (
        <div className="flex gap-2 mt-3 flex-wrap">
          {issue.consoleUrl && (
            <ExternalLink href={issue.consoleUrl}>GCP console</ExternalLink>
          )}
          {issue.projectId && (
            <>
              <ExternalLink
                href={`https://console.firebase.google.com/project/${issue.projectId}/overview`}
              >
                Firebase
              </ExternalLink>
              <ExternalLink
                href={`https://console.cloud.google.com/billing?project=${issue.projectId}`}
              >
                Billing
              </ExternalLink>
            </>
          )}
        </div>
      )}
    </div>
  );
}
