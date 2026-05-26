import { useState } from "react";
import type { DashboardData } from "../types";
import { TableWrap, Th, Td } from "../components/Table";

interface Props {
  data: DashboardData;
}

export function Apis({ data }: Props) {
  const [filter, setFilter] = useState("");

  const q = filter.toLowerCase();
  const rows = data.apiUsage.filter(
    (a) => !q || a.name.toLowerCase().includes(q) || a.title.toLowerCase().includes(q),
  );

  return (
    <div>
      <h1 className="text-2xl font-extrabold mb-1" style={{ fontFamily: "Fraunces, serif" }}>
        Enabled APIs
      </h1>
      <p className="text-sm mb-4" style={{ color: "var(--muted)" }}>
        {data.apiUsage.length} unique APIs across all projects
      </p>

      <div className="mb-4">
        <input
          type="search"
          placeholder="Filter APIs..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-full max-w-md px-3 py-2 rounded-lg text-sm"
          style={{
            background: "var(--panel)",
            border: "1px solid var(--line)",
            color: "var(--ink)",
            outline: "none",
          }}
        />
      </div>

      <TableWrap>
        <table className="w-full" style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <Th>API</Th>
              <Th>Service</Th>
              <Th num># projects</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((a) => (
              <tr key={a.name}>
                <Td>
                  <code className="text-xs">{a.name}</code>
                </Td>
                <Td muted>{a.title}</Td>
                <Td num>
                  {a.projects.length}
                  <details className="inline ml-2">
                    <summary
                      className="cursor-pointer text-xs inline"
                      style={{ color: "var(--accent)" }}
                    >
                      list
                    </summary>
                    <pre
                      className="text-xs mt-1 p-2 rounded"
                      style={{ background: "var(--panel)", whiteSpace: "pre-wrap" }}
                    >
                      {a.projects.join("\n")}
                    </pre>
                  </details>
                </Td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <Td muted colSpan={3}>No APIs match the filter.</Td>
              </tr>
            )}
          </tbody>
        </table>
      </TableWrap>
    </div>
  );
}
