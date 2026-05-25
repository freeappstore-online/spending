import type { DashboardData } from "../types";
import { TableWrap, Th, Td } from "../components/Table";
import { pLabel } from "../lib/fmt";

interface Props {
  data: DashboardData;
}

export function Firestore({ data }: Props) {
  if (data.firestore.length === 0) {
    return (
      <div>
        <h1 className="text-2xl font-extrabold mb-4" style={{ fontFamily: "Fraunces, serif" }}>
          Firestore databases
        </h1>
        <p style={{ color: "var(--muted)" }}>
          No Firestore databases visible. Either none exist, or the Firestore Admin API isn't enabled on those projects.
        </p>
      </div>
    );
  }

  const allDbs = data.firestore.flatMap((entry) =>
    entry.databases.map((db) => ({
      projectId: entry.projectId,
      dbName: db.name.split("/").pop() || db.name,
      locationId: db.locationId,
      type: db.type,
    })),
  );

  return (
    <div>
      <h1 className="text-2xl font-extrabold mb-1" style={{ fontFamily: "Fraunces, serif" }}>
        Firestore databases
      </h1>
      <p className="text-sm mb-4" style={{ color: "var(--muted)" }}>
        {allDbs.length} database{allDbs.length === 1 ? "" : "s"} across {data.firestore.length} project{data.firestore.length === 1 ? "" : "s"}
      </p>

      <TableWrap>
        <table className="w-full" style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <Th>Project</Th>
              <Th>Database</Th>
              <Th>Location</Th>
              <Th>Type</Th>
            </tr>
          </thead>
          <tbody>
            {allDbs.map((db, i) => (
              <tr key={i}>
                <Td>{pLabel(db.projectId, data.projectNames)}</Td>
                <Td>
                  <code className="text-xs">{db.dbName}</code>
                </Td>
                <Td muted>{db.locationId}</Td>
                <Td muted>{db.type}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableWrap>
    </div>
  );
}
