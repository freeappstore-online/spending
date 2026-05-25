import type { DashboardData } from "../types";
import { Card, CardGrid } from "../components/Card";
import { fmtMoney } from "../lib/fmt";

interface Props {
  data: DashboardData;
}

export function Overview({ data }: Props) {
  const totalBudget = sumBudgetsByCurrency(data.budgets);
  const totalBudgetStr =
    Object.entries(totalBudget)
      .map(([ccy, amt]) => `${fmtMoney(amt)} ${ccy}`)
      .join(" / ") || "--";

  const idleCount = data.idleProjects.length;
  const criticalIssues = data.issues.filter((i) => i.severity === "critical").length;
  const highIssues = data.issues.filter((i) => i.severity === "high").length;

  return (
    <div>
      <h1 className="text-2xl font-extrabold mb-1" style={{ fontFamily: "Fraunces, serif" }}>
        Overview
      </h1>
      <p className="text-sm mb-6" style={{ color: "var(--muted)" }}>
        Live from GCP — no pipeline, no stored credentials.
      </p>

      <h3
        className="text-xs uppercase tracking-wider font-medium mb-3"
        style={{ color: "var(--muted)", letterSpacing: "0.08em" }}
      >
        Inventory
      </h3>
      <CardGrid>
        <Card label="Projects" value={data.projects.length} />
        <Card
          label="Active"
          value={data.projects.filter((p) => p.lifecycleState === "ACTIVE").length}
        />
        <Card label="Billing accounts" value={data.billingAccounts.length} />
        <Card label="Resources" value={data.resources.length} />
        <Card label="Budgets set" value={data.budgets.length} />
        <Card label="Budget total / mo" value={totalBudgetStr} small />
        <Card
          label="Uncovered projects"
          value={data.budgetCoverage.uncoveredCount}
          warn={data.budgetCoverage.uncoveredCount > 0}
        />
        <Card
          label="Critical issues"
          value={criticalIssues}
          warn={criticalIssues > 0}
        />
        <Card
          label="High issues"
          value={highIssues}
          warn={highIssues > 0}
        />
        <Card
          label="Likely idle"
          value={idleCount}
          warn={idleCount > 0}
        />
        <Card
          label="Enabled APIs (unique)"
          value={data.apiUsage.length}
        />
        <Card
          label="Projects with Firestore"
          value={data.firestore.length}
        />
        <Card
          label="Fetch errors"
          value={data.errors.length}
          warn={data.errors.length > 0}
        />
      </CardGrid>

      {data.apiUsage.length > 0 && (
        <>
          <h3
            className="text-xs uppercase tracking-wider font-medium mb-3 mt-8"
            style={{ color: "var(--muted)", letterSpacing: "0.08em" }}
          >
            Top 10 APIs by project count
          </h3>
          <div
            className="rounded-xl p-5"
            style={{ background: "var(--panel)", border: "1px solid var(--line)" }}
          >
            {data.apiUsage.slice(0, 10).map((api) => (
              <div key={api.name} className="flex items-center gap-3 mb-2 last:mb-0">
                <div className="flex-1 text-sm truncate">{api.name}</div>
                <div className="flex items-center gap-2">
                  <div
                    className="h-2 rounded-full"
                    style={{
                      width: `${Math.max(20, (api.projects.length / data.projects.length) * 200)}px`,
                      background: "var(--success)",
                      opacity: 0.7,
                    }}
                  />
                  <span className="text-xs tabular-nums" style={{ color: "var(--muted)", minWidth: "2rem", textAlign: "right" }}>
                    {api.projects.length}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {data.resources.length > 0 && (
        <>
          <h3
            className="text-xs uppercase tracking-wider font-medium mb-3 mt-8"
            style={{ color: "var(--muted)", letterSpacing: "0.08em" }}
          >
            Resources by type
          </h3>
          <CardGrid>
            {Object.entries(data.resourceTypeCounts)
              .sort((a, b) => b[1] - a[1])
              .map(([type, count]) => (
                <Card key={type} label={RESOURCE_LABELS[type] || type} value={count} />
              ))}
          </CardGrid>
        </>
      )}
    </div>
  );
}

const RESOURCE_LABELS: Record<string, string> = {
  compute_instances: "Compute VMs",
  cloud_run_services: "Cloud Run",
  storage_buckets: "Storage buckets",
  sql_instances: "Cloud SQL",
  cloud_functions: "Cloud Functions",
  gke_clusters: "GKE clusters",
  pubsub_topics: "Pub/Sub topics",
};

function sumBudgetsByCurrency(
  budgets: { amount: number | null; currency: string }[],
): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const b of budgets) {
    if (b.amount == null || !b.currency) continue;
    totals[b.currency] = (totals[b.currency] || 0) + b.amount;
  }
  return totals;
}
