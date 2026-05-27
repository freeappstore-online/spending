import type { DashboardData } from "../types";
import { Card, CardGrid } from "../components/Card";
import { SimpleBarChart, AreaLineChart, DonutChart, ChartCard, Grid2 } from "../components/Chart";
import { TableWrap, Th, Td, Pill, ExternalLink } from "../components/Table";
import { fmtMoney, pLabel } from "../lib/fmt";
import { aggregateSpend, getMoneyCards, getBleeds, computeBudgetActuals } from "../lib/spend";

interface Props {
  data: DashboardData;
}

export function Overview({ data }: Props) {
  const hasSpend = data.spend.results.length > 0;
  const agg = hasSpend ? aggregateSpend(data.spend.results) : null;
  const money = agg ? getMoneyCards(agg) : null;
  const bleeds = agg ? getBleeds(agg) : [];
  const budgetActuals = agg ? computeBudgetActuals(data.budgets, agg, data.projectNumberToId) : [];
  const budgetAlerts = budgetActuals.filter((b) => b.status === "over" || b.status === "warn");

  const activeProjects = data.projects.filter((p) => p.lifecycleState === "ACTIVE");

  return (
    <div>
      <h1 className="text-2xl font-extrabold mb-1" style={{ fontFamily: "Fraunces, serif" }}>
        Overview
      </h1>
      <p className="text-sm mb-6" style={{ color: "var(--muted)" }}>
        {activeProjects.length} active projects across {data.billingAccounts.length} billing accounts.
      </p>

      {/* Money cards — only if we have BigQuery spend data */}
      {money && (
        <>
          <CardGrid>
            <Card
              label={`This month (${money.thisMonth || "--"})`}
              value={`$${fmtMoney(money.thisMonthTotal)}`}
              sub={money.currency}
              warn={money.thisMonthTotal > 100}
            />
            <Card
              label={`Last month (${money.lastMonth || "--"})`}
              value={`$${fmtMoney(money.lastMonthTotal)}`}
              sub={money.currency + (money.delta != null ? ` / ${money.delta >= 0 ? "+" : ""}${money.delta.toFixed(0)}% MoM` : "")}
            />
            <Card
              label="Burn (7d avg/day)"
              value={`$${fmtMoney(money.avgPerDay)}`}
              sub={`${money.currency}/day / $${fmtMoney(money.burn7dTotal)} over 7d`}
              warn={money.avgPerDay > 5}
            />
            <Card
              label="Projected this month"
              value={`$${fmtMoney(money.projected)}`}
              sub={`${money.currency} at current burn`}
              warn={money.projected > 100}
            />
            {data.issues.length > 0 && (
              <Card
                label="Potential savings"
                value={`$${fmtMoney(data.issues.reduce((s, i) => s + i.estimatedMonthlyCost, 0))}`}
                sub={`${money.currency}/mo across ${data.issues.length} issues`}
                good
              />
            )}
          </CardGrid>
        </>
      )}

      {/* Budget alerts */}
      {budgetAlerts.length > 0 && (
        <BudgetAlerts alerts={budgetAlerts} />
      )}

      {/* Daily spend chart */}
      {agg && Object.keys(agg.byDayAll).length > 0 && (
        <DailySpendChart agg={agg} />
      )}

      {/* Active bleeds table */}
      {bleeds.length > 0 && (
        <BleedsTable bleeds={bleeds} agg={agg!} projectNames={data.projectNames} />
      )}

      {/* Monthly charts */}
      {agg && Object.keys(agg.byMonthAll).length > 0 && (
        <MonthlyCharts agg={agg} projectNames={data.projectNames} />
      )}

      {/* No spend data — show setup hint */}
      {!hasSpend && !data.loading && (
        <div
          className="rounded-xl p-5 mb-6"
          style={{ background: "var(--panel)", border: "1px solid var(--line)", borderLeftWidth: 3, borderLeftColor: "var(--accent)" }}
        >
          <h4 className="font-semibold mb-2">No BigQuery billing export tables found</h4>
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            Cost data requires BigQuery billing export. Enable it once per billing account:
            GCP Console → Billing → Export → BigQuery → Daily cost detail.
            After ~24h the table appears and the dashboard queries it automatically.
          </p>
        </div>
      )}

      {/* Inventory summary */}
      <SectionHead>Inventory</SectionHead>
      <InventorySummary data={data} />
    </div>
  );
}

// --- Sub-components ---

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

function DailySpendChart({ agg }: { agg: ReturnType<typeof aggregateSpend> }) {
  const days = Object.keys(agg.byDayAll).sort().slice(-60);
  const total = days.reduce((s, d) => s + (agg.byDayAll[d] || 0), 0);
  const chartData = days.map((d) => ({ name: d, value: agg.byDayAll[d] || 0 }));

  return (
    <ChartCard title={`Daily spend — last ${days.length} days (total $${fmtMoney(total)} ${agg.currency})`}>
      <AreaLineChart data={chartData} color="#ef4444" height={240} valueFormatter={(v) => `$${fmtMoney(v)}`} />
    </ChartCard>
  );
}

function BleedsTable({
  bleeds,
  agg,
  projectNames,
}: {
  bleeds: ReturnType<typeof getBleeds>;
  agg: ReturnType<typeof aggregateSpend>;
  projectNames: Record<string, string>;
}) {
  return (
    <div className="mt-6">
      <SectionHead>Active bleeds — what's costing you money</SectionHead>
      <p className="text-xs mb-3" style={{ color: "var(--muted)" }}>
        Projects ranked by 7-day average daily spend. {agg.latestDay ? `Through ${agg.latestDay}.` : ""}
      </p>
      <TableWrap>
        <table className="w-full" style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <Th>#</Th>
              <Th>Project</Th>
              <Th num>7d avg/day</Th>
              <Th num>7d total</Th>
              <Th num>This month</Th>
              <Th num>Last month</Th>
              <Th>Top service</Th>
              <Th>Console</Th>
            </tr>
          </thead>
          <tbody>
            {bleeds.map((r, i) => {
              const dailyColor = r.avg > 10 ? "var(--error)" : r.avg > 1 ? "var(--warning)" : undefined;
              return (
                <tr key={r.pid}>
                  <Td muted>{i + 1}</Td>
                  <Td>{pLabel(r.pid, projectNames)}</Td>
                  <Td num style={{ color: dailyColor, fontWeight: 600 }}>${fmtMoney(r.avg)}</Td>
                  <Td num>${fmtMoney(r.burn7d)}</Td>
                  <Td num>
                    ${fmtMoney(r.thisM)}
                    {r.momDelta != null && Math.abs(r.momDelta) > 5 && (
                      <Pill variant={r.momDelta > 50 ? "err" : r.momDelta > 0 ? "warn" : "ok"}>
                        {r.momDelta >= 0 ? "+" : ""}{r.momDelta.toFixed(0)}%
                      </Pill>
                    )}
                  </Td>
                  <Td num>${fmtMoney(r.lastM)}</Td>
                  <Td muted>
                    {r.topSvc} <span className="text-xs">(${fmtMoney(r.topSvcCost)})</span>
                  </Td>
                  <Td>
                    <div className="flex gap-1">
                      <ExternalLink href={`https://console.cloud.google.com/billing/reports;timeRange=THIS_MONTH;projects=${r.pid}?project=${r.pid}`}>
                        Billing
                      </ExternalLink>
                      <ExternalLink href={`https://console.cloud.google.com/run?project=${r.pid}`}>
                        Run
                      </ExternalLink>
                    </div>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </TableWrap>
    </div>
  );
}

function MonthlyCharts({ agg, projectNames }: { agg: ReturnType<typeof aggregateSpend>; projectNames: Record<string, string> }) {
  const months = Object.keys(agg.byMonthAll).sort().slice(-12);
  const monthlyData = months.map((m) => ({ name: m, value: agg.byMonthAll[m] || 0 }));

  // Top 10 projects by this month + last month spend
  const thisMonth = months[months.length - 1];
  const lastMonth = months.length >= 2 ? months[months.length - 2] : null;
  const projectMonthly = Object.keys(agg.byProjectMonth)
    .map((pid) => ({
      pid,
      thisM: thisMonth ? (agg.byProjectMonth[pid]?.[thisMonth] || 0) : 0,
      lastM: lastMonth ? (agg.byProjectMonth[pid]?.[lastMonth] || 0) : 0,
    }))
    .filter((p) => p.thisM > 0.1 || p.lastM > 0.1)
    .sort((a, b) => Math.max(b.thisM, b.lastM) - Math.max(a.thisM, a.lastM))
    .slice(0, 10);

  const projectBarData = projectMonthly.map((p) => ({
    name: pLabel(p.pid, projectNames).slice(0, 20),
    value: p.thisM,
  }));

  return (
    <Grid2>
      <ChartCard title="Total monthly spend">
        <SimpleBarChart data={monthlyData} color="#2563eb" valueFormatter={(v) => `$${fmtMoney(v)}`} />
      </ChartCard>
      {projectBarData.length > 0 && (
        <ChartCard title={`Top projects — ${thisMonth || "this month"}`}>
          <SimpleBarChart data={projectBarData} horizontal color="#ef4444" valueFormatter={(v) => `$${fmtMoney(v)}`} />
        </ChartCard>
      )}
    </Grid2>
  );
}

function InventorySummary({ data }: Props) {
  const activeProjects = data.projects.filter((p) => p.lifecycleState === "ACTIVE");
  const billingLinked = activeProjects.filter((p) => p.billingLinked).length;

  const totalBudget = sumBudgetsByCurrency(data.budgets);
  const totalBudgetStr =
    Object.entries(totalBudget)
      .map(([ccy, amt]) => `${fmtMoney(amt)} ${ccy}`)
      .join(" / ") || "--";

  const resourceTypeData = Object.entries(data.resourceTypeCounts)
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([type, count]) => ({ name: RESOURCE_LABELS[type] || type, value: count }));

  const topApis = data.apiUsage.slice(0, 10).map((a) => ({
    name: a.name.replace(".googleapis.com", ""),
    value: a.projects.length,
  }));

  return (
    <>
      <CardGrid>
        <Card label="Projects" value={data.projects.length} sub={`${activeProjects.length} active`} />
        <Card label="Billing accounts" value={data.billingAccounts.length} sub={`${billingLinked} projects linked`} />
        <Card label="Resources" value={data.resources.length} />
        <Card label="Budgets" value={data.budgets.length} sub={totalBudgetStr !== "--" ? `${totalBudgetStr}/mo` : undefined} />
        <Card label="Uncovered" value={data.budgetCoverage.uncoveredCount} warn={data.budgetCoverage.uncoveredCount > 0} />
        <Card label="Likely idle" value={data.idleProjects.length} warn={data.idleProjects.length > 0} />
        <Card label="APIs" value={data.apiUsage.length} />
        <Card label="Firestore DBs" value={data.firestore.reduce((s, f) => s + f.databases.length, 0)} />
        <Card label="Errors" value={data.errors.length} warn={data.errors.length > 0} />
      </CardGrid>

      {(resourceTypeData.length > 0 || topApis.length > 0) && (
        <Grid2>
          {resourceTypeData.length > 1 && (
            <ChartCard title="Resources by type">
              <DonutChart data={resourceTypeData} />
            </ChartCard>
          )}
          {topApis.length > 0 && (
            <ChartCard title="Top 10 APIs by project count">
              <SimpleBarChart data={topApis} horizontal color="#22c55e" />
            </ChartCard>
          )}
        </Grid2>
      )}
    </>
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

function BudgetAlerts({ alerts }: { alerts: ReturnType<typeof computeBudgetActuals> }) {
  return (
    <div className="mt-6">
      <SectionHead>Budget alerts</SectionHead>
      <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))" }}>
        {alerts.map((a, i) => {
          const barColor =
            a.status === "over" ? "var(--error)" :
            a.status === "warn" ? "var(--warning)" :
            "var(--success)";
          return (
            <div
              key={i}
              className="rounded-xl p-3"
              style={{ background: "var(--panel)", border: "1px solid var(--line)", borderLeftWidth: 4, borderLeftColor: barColor }}
            >
              <div className="flex justify-between items-baseline mb-2 gap-2 flex-wrap">
                <span className="font-medium text-sm">{a.displayName}</span>
                <span className="text-xs tabular-nums" style={{ color: barColor, fontWeight: 600 }}>
                  {a.percentUsed.toFixed(0)}% used
                </span>
              </div>
              <div
                className="h-1.5 rounded-full overflow-hidden mb-1"
                style={{ background: "var(--line)" }}
              >
                <div style={{ width: `${Math.min(100, a.percentUsed)}%`, height: "100%", background: barColor }} />
              </div>
              <div className="text-xs tabular-nums" style={{ color: "var(--muted)" }}>
                ${fmtMoney(a.actualSpend)} of ${fmtMoney(a.amount)} {a.currency}
              </div>
            </div>
          );
        })}
      </div>
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
