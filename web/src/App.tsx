import { FreeAppStore } from "@freeappstore/sdk";
import { Shell } from "./components/Shell";
import { useGoogleAuth } from "./hooks/useGoogleAuth";
import { useHash } from "./hooks/useHash";
import { useGcpData } from "./hooks/useGcpData";
import { Overview } from "./pages/Overview";
import { Projects } from "./pages/Projects";

void new FreeAppStore({ appId: "gcp-spending" });
import { Billing } from "./pages/Billing";
import { Budgets } from "./pages/Budgets";
import { Resources } from "./pages/Resources";
import { Idle } from "./pages/Idle";
import { Apis } from "./pages/Apis";
import { Firestore } from "./pages/Firestore";
import { Issues } from "./pages/Issues";
import { Errors } from "./pages/Errors";

export default function App() {
  const auth = useGoogleAuth();
  const [tab, navigate] = useHash();
  const data = useGcpData(auth.user);

  const signedIn = auth.configured && auth.user;

  return (
    <Shell
      signedInAs={auth.user?.email ?? null}
      onSignOut={auth.user ? auth.signOut : undefined}
      activeTab={tab}
      onNavigate={navigate}
      showTabs={!!signedIn}
    >
      {!auth.configured && <SetupNeeded />}
      {auth.configured && !auth.user && <SignInScreen auth={auth} />}
      {signedIn && (
        <>
          <StatusBar loading={data.loading} phase={data.phase} fetchedAt={data.fetchedAt} onRefresh={data.refresh} />
          {tab === "overview" && <Overview data={data} />}
          {tab === "projects" && <Projects data={data} />}
          {tab === "billing" && <Billing data={data} />}
          {tab === "budgets" && <Budgets data={data} />}
          {tab === "resources" && <Resources data={data} />}
          {tab === "idle" && <Idle data={data} />}
          {tab === "apis" && <Apis data={data} />}
          {tab === "firestore" && <Firestore data={data} />}
          {tab === "issues" && <Issues data={data} />}
          {tab === "errors" && <Errors data={data} />}
        </>
      )}
    </Shell>
  );
}

function SetupNeeded() {
  return (
    <div style={{ maxWidth: "640px" }}>
      <h1 className="text-2xl font-extrabold mb-2" style={{ fontFamily: "Fraunces, serif" }}>
        Setup needed
      </h1>
      <p style={{ color: "var(--muted)" }}>
        <code>VITE_GOOGLE_CLIENT_ID</code> is missing from this build. Set it as an environment variable and redeploy.
      </p>
    </div>
  );
}

function SignInScreen({ auth }: { auth: ReturnType<typeof useGoogleAuth> }) {
  return (
    <div style={{ maxWidth: "560px", padding: "3rem 0" }}>
      <h1 className="text-4xl font-extrabold mb-3" style={{ fontFamily: "Fraunces, serif" }}>
        Your GCP spend, live.
      </h1>
      <p className="text-base mb-8" style={{ color: "var(--muted)", lineHeight: 1.55 }}>
        Sign in with Google. The dashboard pulls projects, billing, budgets, APIs, Firestore, and resource data directly from your account — no backend, no stored credentials.
      </p>
      <button
        type="button"
        onClick={auth.signIn}
        disabled={!auth.ready || auth.signingIn}
        className="font-bold text-base rounded-xl"
        style={{
          background: "var(--accent)",
          color: "white",
          border: 0,
          padding: "0.85rem 2rem",
          fontFamily: "inherit",
          cursor: auth.ready && !auth.signingIn ? "pointer" : "not-allowed",
          opacity: auth.ready && !auth.signingIn ? 1 : 0.6,
        }}
      >
        {auth.signingIn ? "Signing in..." : "Sign in with Google"}
      </button>
      {auth.error && (
        <p className="mt-4 text-sm" style={{ color: "var(--error)" }}>
          {auth.error}
        </p>
      )}
      <p className="mt-6 text-sm" style={{ color: "var(--muted)" }}>
        Read-only scopes: <code className="text-xs px-1 py-0.5 rounded" style={{ background: "var(--panel)" }}>cloud-platform.read-only</code> +{" "}
        <code className="text-xs px-1 py-0.5 rounded" style={{ background: "var(--panel)" }}>bigquery.readonly</code>.
        Token lives in memory only, expires in 1 hour.
      </p>
    </div>
  );
}

function StatusBar({ loading, phase, fetchedAt, onRefresh }: {
  loading: boolean;
  phase: string;
  fetchedAt: number | null;
  onRefresh: () => void;
}) {
  const ago = fetchedAt ? formatAgo(Date.now() - fetchedAt) : null;
  return (
    <div className="flex items-center gap-3 mb-5 text-xs" style={{ color: "var(--muted)" }}>
      {loading && <span>{phase}</span>}
      {!loading && ago && <span>Data from {ago} ago</span>}
      <button
        type="button"
        onClick={onRefresh}
        disabled={loading}
        className="px-3 py-1 rounded-lg text-xs"
        style={{
          background: "var(--panel)",
          border: "1px solid var(--line)",
          color: loading ? "var(--muted)" : "var(--accent)",
          cursor: loading ? "not-allowed" : "pointer",
          fontFamily: "inherit",
          opacity: loading ? 0.5 : 1,
        }}
      >
        {loading ? "Fetching..." : "Refresh"}
      </button>
    </div>
  );
}

function formatAgo(ms: number): string {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}
