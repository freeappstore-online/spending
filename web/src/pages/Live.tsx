import { useState } from "react";
import type { DashboardData, MetricSeries } from "../types";
import { ChartCard, Grid2 } from "../components/Chart";
import { TableWrap, Th, Td } from "../components/Table";
import { fmtInt, pLabel } from "../lib/fmt";
import {
  LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

const PALETTE = [
  "#2563eb", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6",
  "#06b6d4", "#ec4899", "#eab308", "#10b981", "#f97316",
];

interface Props {
  data: DashboardData;
}

export function Live({ data }: Props) {
  const mon = data.monitoring;
  const cfg = mon.config;
  const [selectedMetric, setSelectedMetric] = useState(cfg[0]?.key || "");
  const [selectedProject, setSelectedProject] = useState("");

  if (cfg.length === 0) {
    return (
      <div>
        <h1 className="text-2xl font-extrabold mb-4" style={{ fontFamily: "Fraunces, serif" }}>
          Live activity
        </h1>
        <p style={{ color: "var(--muted)" }}>No monitoring data available.</p>
      </div>
    );
  }

  const mc = cfg.find((c) => c.key === selectedMetric) || cfg[0]!;
  const leaderboard = mon.leaderboard[mc.key] || [];

  const projectsWithData = Object.keys(mon.byProject).sort();

  return (
    <div>
      <h1 className="text-2xl font-extrabold mb-1" style={{ fontFamily: "Fraunces, serif" }}>
        Live activity
      </h1>
      <p className="text-sm mb-4" style={{ color: "var(--muted)" }}>
        Hourly totals, last {mon.windowHours}h. Cloud Monitoring metrics across {projectsWithData.length} project{projectsWithData.length === 1 ? "" : "s"}.
      </p>

      <div className="flex gap-3 mb-4 flex-wrap">
        <select
          value={selectedMetric}
          onChange={(e) => setSelectedMetric(e.target.value)}
          className="px-3 py-2 rounded-lg text-sm"
          style={{ background: "var(--panel)", border: "1px solid var(--line)", color: "var(--ink)" }}
        >
          {cfg.map((c) => (
            <option key={c.key} value={c.key}>{c.label}</option>
          ))}
        </select>
        <select
          value={selectedProject}
          onChange={(e) => setSelectedProject(e.target.value)}
          className="px-3 py-2 rounded-lg text-sm"
          style={{ background: "var(--panel)", border: "1px solid var(--line)", color: "var(--ink)" }}
        >
          <option value="">All projects (top 10)</option>
          {projectsWithData.map((pid) => (
            <option key={pid} value={pid}>{pLabel(pid, data.projectNames)}</option>
          ))}
        </select>
      </div>

      {/* Trend chart: top 10 projects for selected metric */}
      <ChartCard title={`Hourly trend — top 10 projects (${mc.label})`}>
        <TopProjectsTrend
          monitoring={mon}
          metricKey={mc.key}
          leaderboard={leaderboard}
          projectNames={data.projectNames}
        />
      </ChartCard>

      {/* Leaderboard table */}
      <h3 className="text-sm font-semibold mt-6 mb-3">Top projects ({mon.windowHours}h total)</h3>
      <TableWrap>
        <table className="w-full" style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <Th>#</Th>
              <Th>Project</Th>
              <Th num>{mon.windowHours}h total</Th>
              <Th num>per hour (avg)</Th>
              <Th>Action</Th>
            </tr>
          </thead>
          <tbody>
            {leaderboard.length === 0 ? (
              <tr><Td muted colSpan={5}>No data for this metric in the last {mon.windowHours}h.</Td></tr>
            ) : leaderboard.slice(0, 20).map((row, i) => {
              const perHour = row.total / mon.windowHours;
              return (
                <tr key={row.projectId}>
                  <Td muted>{i + 1}</Td>
                  <Td>{pLabel(row.projectId, data.projectNames)}</Td>
                  <Td num>{fmtInt(row.total)}</Td>
                  <Td num>{fmtInt(perHour)}</Td>
                  <Td>
                    <button
                      type="button"
                      onClick={() => setSelectedProject(row.projectId)}
                      className="text-xs"
                      style={{ background: "transparent", border: 0, color: "var(--accent)", cursor: "pointer", padding: 0, fontFamily: "inherit" }}
                    >
                      drill into
                    </button>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </TableWrap>

      {/* Per-project drill-down */}
      {selectedProject && (
        <ProjectDrilldown
          monitoring={mon}
          projectId={selectedProject}
          projectNames={data.projectNames}
        />
      )}
    </div>
  );
}

function TopProjectsTrend({
  monitoring,
  metricKey,
  leaderboard,
  projectNames,
}: {
  monitoring: DashboardData["monitoring"];
  metricKey: string;
  leaderboard: { projectId: string; total: number }[];
  projectNames: Record<string, string>;
}) {
  if (leaderboard.length === 0) {
    return <div className="text-sm" style={{ color: "var(--muted)" }}>No data.</div>;
  }
  const top = leaderboard.slice(0, 10);
  const allTimes = new Set<string>();
  const projectHourly: { pid: string; label: string; hourly: Record<string, number> }[] = [];

  for (const row of top) {
    const series = monitoring.byProject[row.projectId]?.[metricKey] || [];
    const hourly: Record<string, number> = {};
    for (const s of series) {
      for (const pt of s.points) {
        hourly[pt.t] = (hourly[pt.t] || 0) + pt.v;
        allTimes.add(pt.t);
      }
    }
    projectHourly.push({
      pid: row.projectId,
      label: pLabel(row.projectId, projectNames).slice(0, 24),
      hourly,
    });
  }

  const times = [...allTimes].sort();
  // Build chart data as one row per timestamp with a column per project
  const chartData = times.map((t) => {
    const row: Record<string, string | number> = { name: t.slice(5, 16).replace("T", " ") };
    for (const ph of projectHourly) {
      row[ph.label] = ph.hourly[t] || 0;
    }
    return row;
  });

  const tooltipStyle = {
    backgroundColor: "var(--panel)", border: "1px solid var(--line)",
    borderRadius: "8px", fontSize: "12px", color: "var(--ink)",
  };

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData} margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
        <XAxis dataKey="name" tick={{ fill: "var(--muted)", fontSize: 10 }} interval="preserveStartEnd" />
        <YAxis tick={{ fill: "var(--muted)", fontSize: 11 }} />
        <Tooltip contentStyle={tooltipStyle} formatter={(v) => fmtInt(Number(v))} />
        <Legend wrapperStyle={{ fontSize: 10, color: "var(--muted)" }} />
        {projectHourly.map((ph, i) => (
          <Line
            key={ph.pid}
            type="monotone"
            dataKey={ph.label}
            stroke={PALETTE[i % PALETTE.length]}
            strokeWidth={2}
            dot={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

function ProjectDrilldown({
  monitoring,
  projectId,
  projectNames,
}: {
  monitoring: DashboardData["monitoring"];
  projectId: string;
  projectNames: Record<string, string>;
}) {
  const projMetrics = monitoring.byProject[projectId] || {};

  return (
    <div className="mt-8">
      <h3 className="text-sm font-semibold mb-3">
        Drill-down: {pLabel(projectId, projectNames)}
      </h3>
      <Grid2>
        {monitoring.config.map((mc) => {
          const series = projMetrics[mc.key] || [];
          const hasData = series.some((s) => s.points.some((p) => p.v > 0));
          if (!hasData) return (
            <ChartCard key={mc.key} title={mc.label}>
              <div className="text-sm" style={{ color: "var(--muted)" }}>no data</div>
            </ChartCard>
          );
          return (
            <ChartCard key={mc.key} title={mc.label}>
              <SubSeriesChart series={series} mcLabel={mc.label} />
            </ChartCard>
          );
        })}
      </Grid2>
    </div>
  );
}

function SubSeriesChart({ series, mcLabel }: { series: MetricSeries[]; mcLabel: string }) {
  const allTimes = new Set<string>();
  const seriesPts = series.map((s) => {
    const pts: Record<string, number> = {};
    for (const pt of s.points) {
      pts[pt.t] = pt.v;
      allTimes.add(pt.t);
    }
    return { labels: s.labels, pts };
  });
  const times = [...allTimes].sort();
  const chartData = times.map((t) => {
    const row: Record<string, string | number> = { name: t.slice(5, 16).replace("T", " ") };
    seriesPts.forEach((sp, i) => {
      const label = Object.values(sp.labels).join(" / ") || `${mcLabel} #${i + 1}`;
      row[label] = sp.pts[t] || 0;
    });
    return row;
  });

  const tooltipStyle = {
    backgroundColor: "var(--panel)", border: "1px solid var(--line)",
    borderRadius: "8px", fontSize: "12px", color: "var(--ink)",
  };

  const labelKeys = seriesPts.map((sp, i) => Object.values(sp.labels).join(" / ") || `${mcLabel} #${i + 1}`);

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={chartData} margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
        <XAxis dataKey="name" tick={{ fill: "var(--muted)", fontSize: 10 }} interval="preserveStartEnd" />
        <YAxis tick={{ fill: "var(--muted)", fontSize: 10 }} />
        <Tooltip contentStyle={tooltipStyle} formatter={(v) => fmtInt(Number(v))} />
        {labelKeys.length > 1 && <Legend wrapperStyle={{ fontSize: 10, color: "var(--muted)" }} />}
        {labelKeys.map((key, i) => (
          <Line key={key} type="monotone" dataKey={key} stroke={PALETTE[i % PALETTE.length]} strokeWidth={1.5} dot={false} />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
