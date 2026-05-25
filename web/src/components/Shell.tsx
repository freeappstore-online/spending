import type { ReactNode } from "react";
import type { TabId } from "../types";

interface ShellProps {
  children: ReactNode;
  signedInAs?: string | null;
  onSignOut?: () => void;
  activeTab?: TabId;
  onNavigate?: (tab: TabId) => void;
  showTabs?: boolean;
}

const TABS: { id: TabId; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "projects", label: "Projects" },
  { id: "billing", label: "Billing" },
  { id: "budgets", label: "Budgets" },
  { id: "resources", label: "Resources" },
  { id: "idle", label: "Idle" },
  { id: "apis", label: "APIs" },
  { id: "firestore", label: "Firestore" },
  { id: "issues", label: "Issues" },
  { id: "errors", label: "Errors" },
];

export function Shell({ children, signedInAs, onSignOut, activeTab, onNavigate, showTabs }: ShellProps) {
  return (
    <>
      {/* Desktop: sidebar + main */}
      <div className="hidden md:flex h-screen">
        <aside
          className="flex flex-col border-r h-full shrink-0 overflow-y-auto"
          style={{
            width: "17rem",
            borderColor: "var(--line)",
            background: "var(--panel)",
          }}
        >
          <div className="p-6 font-bold text-lg" style={{ fontFamily: "Fraunces, serif" }}>
            spending
          </div>
          {showTabs && (
            <nav className="flex-1 px-3">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => onNavigate?.(t.id)}
                  className="block w-full text-left px-3 py-2 rounded-lg text-sm transition-colors"
                  style={{
                    background: activeTab === t.id ? "var(--accent)" : "transparent",
                    color: activeTab === t.id ? "white" : "var(--muted)",
                    fontWeight: activeTab === t.id ? 600 : 400,
                    border: 0,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    marginBottom: "2px",
                  }}
                >
                  {t.label}
                </button>
              ))}
            </nav>
          )}
          {!showTabs && <nav className="flex-1 px-4" />}
          {signedInAs && (
            <div className="px-4 py-3 text-xs" style={{ color: "var(--muted)" }}>
              <div>Signed in as</div>
              <div style={{ color: "var(--ink)" }}>{signedInAs}</div>
              {onSignOut && (
                <button
                  type="button"
                  onClick={onSignOut}
                  className="mt-1 hover:underline"
                  style={{ color: "var(--muted)", background: "transparent", border: 0, padding: 0, cursor: "pointer", fontFamily: "inherit", fontSize: "inherit" }}
                >
                  Sign out
                </button>
              )}
            </div>
          )}
          <div className="p-4 text-xs" style={{ color: "var(--muted)" }}>
            <a
              href="https://freeappstore.online"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline"
              style={{ color: "var(--muted)" }}
            >
              Part of FreeAppStore
            </a>
          </div>
        </aside>
        <main className="flex-1 overflow-auto p-8">{children}</main>
      </div>

      {/* Mobile: header + main + dock */}
      <div className="flex flex-col h-screen md:hidden">
        <header
          className="flex items-center px-4 h-14 border-b shrink-0"
          style={{ borderColor: "var(--line)", background: "var(--panel)" }}
        >
          <span className="font-bold" style={{ fontFamily: "Fraunces, serif" }}>
            spending
          </span>
        </header>
        <main className="flex-1 overflow-auto p-4">{children}</main>
        {showTabs && (
          <nav
            className="flex items-center border-t shrink-0 overflow-x-auto gap-1 px-2 py-2"
            style={{ borderColor: "var(--line)", background: "var(--panel)" }}
          >
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => onNavigate?.(t.id)}
                className="whitespace-nowrap px-3 py-1.5 rounded-full text-xs"
                style={{
                  background: activeTab === t.id ? "var(--accent)" : "transparent",
                  color: activeTab === t.id ? "white" : "var(--muted)",
                  fontWeight: activeTab === t.id ? 600 : 400,
                  border: "1px solid",
                  borderColor: activeTab === t.id ? "var(--accent)" : "var(--line)",
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                {t.label}
              </button>
            ))}
          </nav>
        )}
      </div>
    </>
  );
}
