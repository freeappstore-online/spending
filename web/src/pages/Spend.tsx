import { useState } from "react";
import type { DashboardData, SpendResult } from "../types";
import { SimpleBarChart, AreaLineChart, ChartCard, Grid2 } from "../components/Chart";
import { TableWrap, Th, Td } from "../components/Table";
import { fmtMoney, pLabel } from "../lib/fmt";

interface Props {
  data: DashboardData;
}

export function Spend({ data }: Props) {
  const results = data.spend.results;
  const [selectedProject, setSelectedProject] = useState("");

  if (results.length === 0) {
    return (
      <div>
        <h1 className="text-2xl font-extrabold mb-4" style={{ fontFamily: "Fraunces, serif" }}>
          Spend
        </h1>
        <SpendSetup billingAccounts={data.billingAccounts} />
      </div>
    );
  }

  // Aggregate project totals for the dropdown
  const projectTotals: Record<string, number> = {};
  for (const r of results) {
    for (const row of r.byProjectService) {
      projectTotals[row.project_id] = (projectTotals[row.project_id] || 0) + row.cost + row.credits;
    }
  }
  const sortedProjects = Object.entries(projectTotals)
    .filter(([, v]) => Math.abs(v) > 0.01)
    .sort((a, b) => b[1] - a[1]);

  const drillProject = selectedProject || sortedProjects[0]?.[0] || "";

  return (
    <div>
      <h1 className="text-2xl font-extrabold mb-4" style={{ fontFamily: "Fraunces, serif" }}>
        Spend
      </h1>

      {results.map((r, idx) => (
        <SpendCard key={idx} result={r} />
      ))}

      {/* Project drill-down */}
      {sortedProjects.length > 0 && (
        <div className="mt-8">
          <h3 className="text-lg font-bold mb-3" style={{ fontFamily: "Fraunces, serif" }}>
            Project cost drill-down
          </h3>
          <div className="mb-4">
            <select
              value={drillProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="px-3 py-2 rounded-lg text-sm"
              style={{ background: "var(--panel)", border: "1px solid var(--line)", color: "var(--ink)" }}
            >
              {sortedProjects.map(([pid, total]) => (
                <option key={pid} value={pid}>
                  {pLabel(pid, data.projectNames)} — ${fmtMoney(total)}
                </option>
              ))}
            </select>
          </div>
          {drillProject && <ProjectDrilldown results={results} projectId={drillProject} />}
        </div>
      )}
    </div>
  );
}

function SpendCard({ result: r }: { result: SpendResult }) {
  const monthlyData = (r.byMonth || []).map((row) => ({ name: row.month, value: row.cost }));
  const dailyData = (r.byDay || []).map((row) => ({ name: row.day, value: row.cost }));
  const topServices = (r.byService || []).slice(0, 10).map((row) => ({ name: row.service, value: row.cost }));

  return (
    <div
      className="rounded-xl p-5 mb-5"
      style={{ background: "var(--panel)", border: "1px solid var(--line)" }}
    >
      <div className="flex justify-between items-center flex-wrap gap-2 mb-3">
        <h3 className="text-sm font-mono">
          {r.table.projectId}.{r.table.datasetId}.{r.table.tableId}
        </h3>
        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(22,163,74,0.12)", color: "var(--success)" }}>
          {r.windowDays}d window
        </span>
      </div>

      <div className="flex gap-6 mb-4 flex-wrap">
        <div>
          <div className="text-xs uppercase" style={{ color: "var(--muted)" }}>Gross ({r.windowDays}d)</div>
          <div className="text-lg font-semibold tabular-nums">{fmtMoney(r.totalCost)} {r.currency}</div>
        </div>
        <div>
          <div className="text-xs uppercase" style={{ color: "var(--muted)" }}>Credits</div>
          <div className="text-lg font-semibold tabular-nums">{fmtMoney(r.totalCredits)} {r.currency}</div>
        </div>
        <div>
          <div className="text-xs uppercase" style={{ color: "var(--muted)" }}>Net</div>
          <div className="text-lg font-semibold tabular-nums" style={{ color: "var(--success)" }}>
            {fmtMoney(r.netCost)} {r.currency}
          </div>
        </div>
      </div>

      <Grid2>
        {monthlyData.length > 0 && (
          <ChartCard title={`Monthly trend`}>
            <SimpleBarChart data={monthlyData} color="#2563eb" valueFormatter={(v) => `$${fmtMoney(v)}`} />
          </ChartCard>
        )}
        {dailyData.length > 0 && (
          <ChartCard title="Daily cost">
            <AreaLineChart data={dailyData} color="#22c55e" valueFormatter={(v) => `$${fmtMoney(v)}`} />
          </ChartCard>
        )}
      </Grid2>

      {topServices.length > 0 && (
        <div className="mt-4">
          <ChartCard title="Top services">
            <SimpleBarChart data={topServices} horizontal color="#f59e0b" valueFormatter={(v) => `$${fmtMoney(v)}`} />
          </ChartCard>
        </div>
      )}

      {/* Cost by project table */}
      {r.byProject.length > 0 && (
        <details className="mt-4">
          <summary className="cursor-pointer text-xs" style={{ color: "var(--accent)" }}>
            Cost by project ({r.windowDays}d)
          </summary>
          <TableWrap>
            <table className="w-full" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <Th>Project</Th>
                  <Th num>Cost</Th>
                  <Th num>Credits</Th>
                </tr>
              </thead>
              <tbody>
                {r.byProject.map((p, i) => (
                  <tr key={i}>
                    <Td><code className="text-xs">{p.project_id}</code></Td>
                    <Td num>{fmtMoney(p.cost)}</Td>
                    <Td num>{fmtMoney(p.credits)}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        </details>
      )}
    </div>
  );
}

function ProjectDrilldown({ results, projectId }: { results: SpendResult[]; projectId: string }) {
  const services: Record<string, { gross: number; credits: number }> = {};
  for (const r of results) {
    for (const row of r.byProjectService) {
      if (row.project_id !== projectId) continue;
      if (!services[row.service]) services[row.service] = { gross: 0, credits: 0 };
      services[row.service]!.gross += row.cost;
      services[row.service]!.credits += row.credits;
    }
  }

  const sorted = Object.entries(services)
    .map(([svc, v]) => ({ svc, gross: v.gross, credits: v.credits, net: v.gross + v.credits }))
    .sort((a, b) => b.net - a.net);

  const total = sorted.reduce((s, r) => s + r.net, 0);

  const chartData = sorted.map((r) => ({ name: r.svc, value: r.net }));

  return (
    <>
      {chartData.length > 0 && (
        <ChartCard title={`Cost by service — ${projectId}`}>
          <SimpleBarChart data={chartData} horizontal valueFormatter={(v) => `$${fmtMoney(v)}`} />
        </ChartCard>
      )}
      {sorted.length > 0 && (
        <TableWrap>
          <table className="w-full" style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <Th>Service</Th>
                <Th num>Gross</Th>
                <Th num>Credits</Th>
                <Th num>Net</Th>
                <Th num>% of project</Th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r, i) => {
                const pct = total > 0 ? (r.net / total) * 100 : 0;
                return (
                  <tr key={i}>
                    <Td>{r.svc}</Td>
                    <Td num>{fmtMoney(r.gross)}</Td>
                    <Td num>{fmtMoney(r.credits)}</Td>
                    <Td num style={{ fontWeight: 600 }}>{fmtMoney(r.net)}</Td>
                    <Td num>{pct.toFixed(1)}%</Td>
                  </tr>
                );
              })}
              <tr style={{ borderTop: "2px solid var(--line)" }}>
                <Td style={{ fontWeight: 700 }}>TOTAL</Td>
                <Td num style={{ fontWeight: 700 }}>{fmtMoney(sorted.reduce((s, r) => s + r.gross, 0))}</Td>
                <Td num style={{ fontWeight: 700 }}>{fmtMoney(sorted.reduce((s, r) => s + r.credits, 0))}</Td>
                <Td num style={{ fontWeight: 700, color: "var(--success)" }}>{fmtMoney(total)}</Td>
                <Td num>100%</Td>
              </tr>
            </tbody>
          </table>
        </TableWrap>
      )}
    </>
  );
}

function SpendSetup({ billingAccounts }: { billingAccounts: DashboardData["billingAccounts"] }) {
  return (
    <div
      className="rounded-xl p-5"
      style={{ background: "var(--panel)", border: "1px solid var(--line)", borderLeftWidth: 3, borderLeftColor: "var(--accent)" }}
    >
      <h4 className="font-semibold mb-2">No BigQuery billing export tables found</h4>
      <p className="text-sm mb-3" style={{ color: "var(--muted)" }}>
        Cost data requires BigQuery billing export — a one-time setup per billing account.
      </p>
      <ol className="text-sm list-decimal ml-5 mb-3" style={{ color: "var(--muted)", lineHeight: 1.8 }}>
        <li>Open the export page (links below).</li>
        <li>Under <strong>BigQuery export → Daily cost detail</strong>, click <strong>Edit settings</strong>.</li>
        <li>Pick a project and dataset (or create <code>billing_export</code>).</li>
        <li>Save. After ~24h the table appears automatically.</li>
        <li>Click <strong>Refresh</strong> in this dashboard.</li>
      </ol>
      {billingAccounts.length > 0 && (
        <ul className="text-sm list-disc ml-5">
          {billingAccounts.map((ba) => (
            <li key={ba.id} className="mb-1">
              <strong>{ba.displayName}</strong>{" "}
              <code className="text-xs">{ba.id}</code>{" "}
              <a
                href={`https://console.cloud.google.com/billing/${ba.id}/export`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs"
                style={{ color: "var(--accent)" }}
              >
                enable BQ export →
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
