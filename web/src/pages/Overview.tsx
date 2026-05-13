import { useEffect, useState } from "react";
import type { SignedInUser } from "../types";
import { listProjects, type GcpProject, GcpError } from "../lib/gcp";

interface OverviewProps {
  user: SignedInUser;
}

// Smoke-test page: fetches projects.list and renders counts.
// Real Overview content (cards, charts, bleeds table) ports here later,
// once we know the OAuth/CORS path is healthy.
export function Overview({ user }: OverviewProps) {
  const [projects, setProjects] = useState<GcpProject[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setProjects(null);
    setError(null);
    listProjects(user.accessToken)
      .then((p) => {
        if (alive) setProjects(p);
      })
      .catch((e: unknown) => {
        if (!alive) return;
        setError(
          e instanceof GcpError
            ? `${e.status} ${e.endpoint}: ${e.message}`
            : e instanceof Error
              ? e.message
              : "unknown error",
        );
      });
    return () => {
      alive = false;
    };
  }, [user.accessToken]);

  return (
    <div style={{ maxWidth: "780px" }}>
      <h1 style={{ fontFamily: "Fraunces, serif", fontSize: "2rem", fontWeight: 800, margin: "0 0 0.5rem" }}>
        Overview
      </h1>
      <p style={{ color: "var(--muted)", marginBottom: "2rem" }}>
        Live from GCP — no nightly pipeline, no stored credentials.
      </p>

      {!projects && !error && <p style={{ color: "var(--muted)" }}>Loading projects…</p>}
      {error && (
        <pre
          style={{
            background: "var(--panel)",
            border: "1px solid var(--line)",
            borderRadius: "0.75rem",
            padding: "1rem",
            color: "var(--error)",
            whiteSpace: "pre-wrap",
            fontSize: "0.85rem",
          }}
        >
          {error}
        </pre>
      )}
      {projects && (
        <div
          style={{
            background: "var(--panel)",
            border: "1px solid var(--line)",
            borderRadius: "1.25rem",
            padding: "1.5rem",
          }}
        >
          <div style={{ fontSize: "0.85rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}>
            Projects
          </div>
          <div style={{ fontSize: "2.5rem", fontWeight: 800, fontFamily: "Fraunces, serif", marginTop: "0.25rem" }}>
            {projects.length}
          </div>
          <div style={{ color: "var(--muted)", fontSize: "0.9rem", marginTop: "0.5rem" }}>
            Active: {projects.filter((p) => p.lifecycleState === "ACTIVE").length}
          </div>
        </div>
      )}
    </div>
  );
}
