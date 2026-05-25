import { useState } from "react";
import type { DashboardData } from "../types";
import { TableWrap, Th, Td, Pill, ExternalLink } from "../components/Table";
import { pLabel } from "../lib/fmt";

interface Props {
  data: DashboardData;
}

export function Projects({ data }: Props) {
  const [filter, setFilter] = useState("");
  const [onlyUnlinked, setOnlyUnlinked] = useState(false);

  const q = filter.toLowerCase();
  const rows = data.projects
    .filter((p) => {
      if (onlyUnlinked && p.billingLinked) return false;
      if (!q) return true;
      return (
        p.projectId.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => (b.createTime || "").localeCompare(a.createTime || ""));

  return (
    <div>
      <h1 className="text-2xl font-extrabold mb-1" style={{ fontFamily: "Fraunces, serif" }}>
        Projects
      </h1>
      <p className="text-sm mb-4" style={{ color: "var(--muted)" }}>
        {data.projects.length} total, {data.projects.filter((p) => p.lifecycleState === "ACTIVE").length} active
      </p>

      <div className="flex gap-3 items-center mb-4 flex-wrap">
        <input
          type="search"
          placeholder="Filter by id, name..."
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
        <label className="text-sm flex items-center gap-2" style={{ color: "var(--muted)" }}>
          <input
            type="checkbox"
            checked={onlyUnlinked}
            onChange={(e) => setOnlyUnlinked(e.target.checked)}
          />
          Only unlinked
        </label>
      </div>

      <TableWrap>
        <table className="w-full" style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <Th>Project</Th>
              <Th num>APIs</Th>
              <Th num>Resources</Th>
              <Th num>Firestore</Th>
              <Th>Billing</Th>
              <Th>Budget</Th>
              <Th>Status</Th>
              <Th>Created</Th>
              <Th>Links</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.projectId} className="hover:opacity-80">
                <Td>
                  <div className="font-medium">{pLabel(p.projectId, data.projectNames)}</div>
                  {data.projectNames[p.projectId] && (
                    <div className="text-xs" style={{ color: "var(--muted)" }}>
                      {p.projectId}
                    </div>
                  )}
                </Td>
                <Td num>{p.enabledServiceCount}</Td>
                <Td num>{p.resourceCount}</Td>
                <Td num>{p.firestoreDatabases.length}</Td>
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
                <Td>
                  <Pill variant={p.idle ? "warn" : "ok"}>
                    {p.idle ? "idle" : "active"}
                  </Pill>
                </Td>
                <Td muted>{(p.createTime || "").slice(0, 10)}</Td>
                <Td>
                  <div className="flex gap-2">
                    <ExternalLink href={`https://console.cloud.google.com/home/dashboard?project=${p.projectId}`}>
                      GCP
                    </ExternalLink>
                    <ExternalLink href={`https://console.firebase.google.com/project/${p.projectId}/overview`}>
                      Firebase
                    </ExternalLink>
                  </div>
                </Td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <Td muted>
                  No projects match the filter.
                </Td>
              </tr>
            )}
          </tbody>
        </table>
      </TableWrap>
    </div>
  );
}
