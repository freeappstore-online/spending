import type { DashboardData } from "../types";
import { TableWrap, Th, Td } from "../components/Table";

interface Props {
  data: DashboardData;
}

export function Errors({ data }: Props) {
  if (data.errors.length === 0) {
    return (
      <div>
        <h1 className="text-2xl font-extrabold mb-4" style={{ fontFamily: "Fraunces, serif" }}>
          Fetch errors
        </h1>
        <p style={{ color: "var(--success)" }}>
          No errors on this fetch. All API calls succeeded.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-extrabold mb-1" style={{ fontFamily: "Fraunces, serif" }}>
        Fetch errors
      </h1>
      <p className="text-sm mb-4" style={{ color: "var(--muted)" }}>
        {data.errors.length} error{data.errors.length === 1 ? "" : "s"} encountered while fetching data. These indicate what the dashboard is <em>not</em> showing.
      </p>

      <TableWrap>
        <table className="w-full" style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <Th>Context</Th>
              <Th>Error</Th>
            </tr>
          </thead>
          <tbody>
            {data.errors.map((e, i) => (
              <tr key={i}>
                <Td>
                  <code className="text-xs">{e.context}</code>
                </Td>
                <Td>
                  <details>
                    <summary className="cursor-pointer text-xs" style={{ color: "var(--accent)" }}>
                      show
                    </summary>
                    <pre
                      className="text-xs mt-1 p-2 rounded max-w-lg overflow-auto"
                      style={{ background: "var(--paper)", whiteSpace: "pre-wrap" }}
                    >
                      {e.message}
                    </pre>
                  </details>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableWrap>
    </div>
  );
}
