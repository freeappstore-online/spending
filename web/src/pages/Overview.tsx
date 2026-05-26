import type { DashboardData } from "../types";
import { Card, CardGrid } from "../components/Card";
import { SimpleBarChart, DonutChart, ChartCard, Grid2 } from "../components/Chart";
import { TableWrap, Th, Td, Pill, ExternalLink } from "../components/Table";
import { fmtMoney, pLabel } from "../lib/fmt";

interface Props {
  data: DashboardData;
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

export function Overview({ data }: Props) {
  const totalBudget = sumBudgetsByCurrency(data.budgets);
  const totalBudgetStr =
    Object.entries(totalBudget)
      .map(([ccy, amt]) => `${fmtMoney(amt)} ${ccy}`)
      .join(" / ") || "--";

  const idleCount = data.idleProjects.length;
  const criticalIssues = data.issues.filter((i) => i.severity === "critical").length;
  const highIssues = data.issues.filter((i) => i.severity === "high").length;
  const activeProjects = data.projects.filter((p) => p.lifecycleState === "ACTIVE");

  // Per-project resource counts for chart
  const projectResourceCounts = activeProjects
    .map((p) => ({ name: pLabel(p.projectId, data.projectNames), value: p.resourceCount }))
    .filter((p) => p.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  // Resource type distribution for donut
  const resourceTypeData = Object.entries(data.resourceTypeCounts)
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([type, count]) => ({ name: RESOURCE_LABELS[type] || type, value: count }));

  // Top APIs for horizontal bar
  const topApis = data.apiUsage.slice(0, 10).map((a) => ({
    name: a.name.replace(".googleapis.com", ""),
    value: a.projects.length,
  }));

  // Projects with most APIs
  const projectApiCounts = activeProjects
    .map((p) => ({ name: pLabel(p.projectId, data.projectNames), value: p.enabledServiceCount }))
    .filter((p) => p.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  // Billing status breakdown
  const billingLinked = activeProjects.filter((p) => p.billingLinked).length;
  const billingUnlinked = activeProjects.length - billingLinked;
  const budgetCovered = activeProjects.filter((p) => p.budgetCovered).length;
  const budgetUncovered = activeProjects.length - budgetCovered;

  return (
    <div>
      <h1 className="text-2xl font-extrabold mb-1" style={{ fontFamily: "Fraunces, serif" }}>
        Overview
      </h1>
      <p className="text-sm mb-6" style={{ color: "var(--muted)" }}>
        Live from GCP — {activeProjects.length} active projects across {data.billingAccounts.length} billing accounts.
      </p>

      {/* Inventory summary cards */}
      <CardGrid>
        <Card label="Projects" value={data.projects.length} sub={`${activeProjects.length} active`} />
        <Card label="Billing accounts" value={data.billingAccounts.length} />
        <Card label="Resources" value={data.resources.length} />
        <Card label="Budgets set" value={data.budgets.length} />
        <Card label="Budget total / mo" value={totalBudgetStr} small />
        <Card
          label="Uncovered projects"
          value={data.budgetCoverage.uncoveredCount}
          warn={data.budgetCoverage.uncoveredCount > 0}
          sub={`${billingLinked} billed, ${budgetCovered} budgeted`}
        />
        <Card label="Issues" value={data.issues.length}
          warn={criticalIssues > 0 || highIssues > 0}
          sub={criticalIssues > 0 ? `${criticalIssues} critical, ${highIssues} high` : highIssues > 0 ? `${highIssues} high` : undefined}
        />
        <Card label="Likely idle" value={idleCount} warn={idleCount > 0} />
        <Card label="Enabled APIs" value={data.apiUsage.length} />
        <Card label="Firestore DBs" value={data.firestore.reduce((s, f) => s + f.databases.length, 0)} />
        <Card label="Fetch errors" value={data.errors.length} warn={data.errors.length > 0} />
      </CardGrid>

      {/* Billing & budget coverage */}
      <SectionHead>Coverage</SectionHead>
      <Grid2>
        <ChartCard title="Billing status">
          <DonutChart data={[
            { name: "Linked", value: billingLinked },
            ...(billingUnlinked > 0 ? [{ name: "Unlinked", value: billingUnlinked }] : []),
          ]} />
        </ChartCard>
        <ChartCard title="Budget coverage">
          <DonutChart data={[
            { name: "Covered", value: budgetCovered },
            ...(budgetUncovered > 0 ? [{ name: "Uncovered", value: budgetUncovered }] : []),
          ]} />
        </ChartCard>
      </Grid2>

      {/* Resource charts */}
      {data.resources.length > 0 && (
        <>
          <SectionHead>Resources</SectionHead>
          <CardGrid>
            {Object.entries(data.resourceTypeCounts)
              .sort((a, b) => b[1] - a[1])
              .map(([type, count]) => (
                <Card key={type} label={RESOURCE_LABELS[type] || type} value={count} />
              ))}
          </CardGrid>
          <Grid2>
            {resourceTypeData.length > 1 && (
              <ChartCard title="Resources by type">
                <DonutChart data={resourceTypeData} />
              </ChartCard>
            )}
            {projectResourceCounts.length > 0 && (
              <ChartCard title="Top 10 projects by resource count">
                <SimpleBarChart data={projectResourceCounts} horizontal color="#22c55e" />
              </ChartCard>
            )}
          </Grid2>
        </>
      )}

      {/* API charts */}
      {data.apiUsage.length > 0 && (
        <>
          <SectionHead>APIs</SectionHead>
          <Grid2>
            <ChartCard title="Top 10 APIs by project count">
              <SimpleBarChart data={topApis} horizontal color="#22c55e" />
            </ChartCard>
            <ChartCard title="Top 10 projects by enabled APIs">
              <SimpleBarChart data={projectApiCounts} horizontal color="#2563eb" />
            </ChartCard>
          </Grid2>
        </>
      )}

      {/* Projects needing attention */}
      {(data.idleProjects.length > 0 || data.budgetCoverage.uncoveredCount > 0) && (
        <>
          <SectionHead>Needs attention</SectionHead>
          {data.budgetCoverage.uncoveredCount > 0 && (
            <AttentionTable
              title={`${data.budgetCoverage.uncoveredCount} projects with billing but no budget`}
              projects={activeProjects.filter((p) => p.billingLinked && !p.budgetCovered)}
              projectNames={data.projectNames}
            />
          )}
          {data.idleProjects.length > 0 && (
            <AttentionTable
              title={`${data.idleProjects.length} likely idle projects`}
              projects={activeProjects.filter((p) => p.idle)}
              projectNames={data.projectNames}
            />
          )}
        </>
      )}
    </div>
  );
}

function SectionHead({ children }: { children: React.ReactNode }) {
  return (
    <h3
      className="text-xs uppercase tracking-wider font-medium mb-3 mt-8"
      style={{ color: "var(--muted)", letterSpacing: "0.08em" }}
    >
      {children}
    </h3>
  );
}

function AttentionTable({
  title,
  projects,
  projectNames,
}: {
  title: string;
  projects: DashboardData["projects"];
  projectNames: Record<string, string>;
}) {
  return (
    <div className="mb-4">
      <p className="text-sm font-medium mb-2">{title}</p>
      <TableWrap>
        <table className="w-full" style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <Th>Project</Th>
              <Th>Billing</Th>
              <Th>Budget</Th>
              <Th num>Resources</Th>
              <Th>Created</Th>
              <Th>Links</Th>
            </tr>
          </thead>
          <tbody>
            {projects.slice(0, 10).map((p) => (
              <tr key={p.projectId}>
                <Td>{pLabel(p.projectId, projectNames)}</Td>
                <Td>
                  <Pill variant={p.billingLinked ? "ok" : "warn"}>
                    {p.billingLinked ? "linked" : "none"}
                  </Pill>
                </Td>
                <Td>
                  <Pill variant={p.budgetCovered ? "ok" : "warn"}>
                    {p.budgetCovered ? "covered" : "none"}
                  </Pill>
                </Td>
                <Td num>{p.resourceCount}</Td>
                <Td muted>{(p.createTime || "").slice(0, 10)}</Td>
                <Td>
                  <ExternalLink href={`https://console.cloud.google.com/home/dashboard?project=${p.projectId}`}>
                    GCP
                  </ExternalLink>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableWrap>
    </div>
  );
}

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
