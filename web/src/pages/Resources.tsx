import { useState } from "react";
import type { DashboardData } from "../types";
import { Card, CardGrid } from "../components/Card";
import { TableWrap, Th, Td, Pill, ExternalLink } from "../components/Table";
import { pLabel } from "../lib/fmt";

const RESOURCE_LABELS: Record<string, string> = {
  compute_instances: "Compute VM",
  cloud_run_services: "Cloud Run",
  storage_buckets: "Storage bucket",
  sql_instances: "Cloud SQL",
  cloud_functions: "Cloud Function",
  gke_clusters: "GKE cluster",
  pubsub_topics: "Pub/Sub topic",
};

interface Props {
  data: DashboardData;
}

export function Resources({ data }: Props) {
  const [filter, setFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  const q = filter.toLowerCase();
  const rows = data.resources.filter((r) => {
    if (typeFilter && r.type !== typeFilter) return false;
    if (!q) return true;
    return (
      r.name.toLowerCase().includes(q) ||
      r.projectId.toLowerCase().includes(q) ||
      r.typeLabel.toLowerCase().includes(q)
    );
  });

  const types = Object.entries(data.resourceTypeCounts)
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1]);

  return (
    <div>
      <h1 className="text-2xl font-extrabold mb-4" style={{ fontFamily: "Fraunces, serif" }}>
        Resources
      </h1>

      <CardGrid>
        {types.map(([type, count]) => (
          <Card key={type} label={RESOURCE_LABELS[type] || type} value={count} />
        ))}
      </CardGrid>

      <div className="flex gap-3 items-center mb-4 flex-wrap">
        <input
          type="search"
          placeholder="Filter by name, project, type..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="flex-1 min-w-[200px] px-3 py-2 rounded-lg text-sm"
          style={{
            background: "var(--panel)",
            border: "1px solid var(--line)",
            color: "var(--ink)",
            outline: "none",
          }}
        />
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-2 rounded-lg text-sm"
          style={{
            background: "var(--panel)",
            border: "1px solid var(--line)",
            color: "var(--ink)",
          }}
        >
          <option value="">All types</option>
          {types.map(([type, count]) => (
            <option key={type} value={type}>
              {RESOURCE_LABELS[type] || type} ({count})
            </option>
          ))}
        </select>
      </div>

      <TableWrap>
        <table className="w-full" style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <Th>Type</Th>
              <Th>Name</Th>
              <Th>Project</Th>
              <Th>Location</Th>
              <Th>Details</Th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 500).map((r, i) => {
              const loc = r.zone || r.region || r.location || "";
              const details = buildDetails(r);
              return (
                <tr key={i}>
                  <Td>
                    <Pill>{r.typeLabel}</Pill>
                  </Td>
                  <Td>
                    <code className="text-xs">{r.name}</code>
                  </Td>
                  <Td>{pLabel(r.projectId, data.projectNames)}</Td>
                  <Td muted>{loc}</Td>
                  <Td muted>
                    <div className="flex gap-2 items-center">
                      <span className="text-xs">{details}</span>
                      {r.url && <ExternalLink href={r.url}>open</ExternalLink>}
                    </div>
                  </Td>
                </tr>
              );
            })}
            {rows.length > 500 && (
              <tr>
                <Td muted colSpan={5}>...{rows.length - 500} more (narrow the filter)</Td>
              </tr>
            )}
            {rows.length === 0 && (
              <tr>
                <Td muted colSpan={5}>No resources discovered.</Td>
              </tr>
            )}
          </tbody>
        </table>
      </TableWrap>
    </div>
  );
}

function buildDetails(r: DashboardData["resources"][0]): string {
  const bits: string[] = [];
  if (r.status) bits.push(`status: ${r.status}`);
  if (r.state) bits.push(`state: ${r.state}`);
  if (r.machineType) bits.push(`machine: ${r.machineType}`);
  if (r.tier) bits.push(`tier: ${r.tier}`);
  if (r.databaseVersion) bits.push(`db: ${r.databaseVersion}`);
  if (r.runtime) bits.push(`runtime: ${r.runtime}`);
  if (r.storageClass) bits.push(`class: ${r.storageClass}`);
  if (r.currentNodeCount != null) bits.push(`nodes: ${r.currentNodeCount}`);
  return bits.join(" / ") || "";
}
