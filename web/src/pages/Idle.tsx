import type { DashboardData } from "../types";
import { TableWrap, Th, Td, ExternalLink } from "../components/Table";
import { pLabel, ageStr } from "../lib/fmt";

interface Props {
  data: DashboardData;
}

export function Idle({ data }: Props) {
  const rows = data.idleProjects
    .map((p) => ({
      ...p,
      age: ageStr(p.createTime),
      ageDays: p.createTime
        ? Math.floor((Date.now() - new Date(p.createTime).getTime()) / 86400000)
        : 0,
    }))
    .sort((a, b) => b.ageDays - a.ageDays);

  return (
    <div>
      <h1 className="text-2xl font-extrabold mb-1" style={{ fontFamily: "Fraunces, serif" }}>
        Likely idle projects
      </h1>
      <p className="text-sm mb-6" style={{ color: "var(--muted)" }}>
        Projects with no resources, no Firestore databases, no budget coverage, no billing link, and created more than 6 months ago.
      </p>

      <TableWrap>
        <table className="w-full" style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <Th>Project</Th>
              <Th>Created</Th>
              <Th num>Age</Th>
              <Th>Action</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.projectId}>
                <Td>{pLabel(p.projectId, data.projectNames)}</Td>
                <Td muted>{(p.createTime || "").slice(0, 10)}</Td>
                <Td num>{p.age}</Td>
                <Td>
                  <ExternalLink
                    href={`https://console.cloud.google.com/iam-admin/settings?project=${p.projectId}`}
                  >
                    inspect
                  </ExternalLink>
                </Td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <Td muted>No projects match the idle heuristic.</Td>
              </tr>
            )}
          </tbody>
        </table>
      </TableWrap>
    </div>
  );
}
