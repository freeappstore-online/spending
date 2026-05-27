import { lazy, Suspense } from "react";
import { FreeAppStore } from "@freeappstore/sdk";
import { Shell } from "./components/Shell";
import { useGoogleAuth } from "./hooks/useGoogleAuth";
import { useHash } from "./hooks/useHash";
import { useGcpData } from "./hooks/useGcpData";

// Register the app with FAS — the SDK side-effect proves the package loads.
new FreeAppStore({ appId: "gcp-spending" });

const Overview = lazy(() => import("./pages/Overview").then((m) => ({ default: m.Overview })));
const Spend = lazy(() => import("./pages/Spend").then((m) => ({ default: m.Spend })));
const Projects = lazy(() => import("./pages/Projects").then((m) => ({ default: m.Projects })));
const Billing = lazy(() => import("./pages/Billing").then((m) => ({ default: m.Billing })));
const Budgets = lazy(() => import("./pages/Budgets").then((m) => ({ default: m.Budgets })));
const Resources = lazy(() => import("./pages/Resources").then((m) => ({ default: m.Resources })));
const Idle = lazy(() => import("./pages/Idle").then((m) => ({ default: m.Idle })));
const Apis = lazy(() => import("./pages/Apis").then((m) => ({ default: m.Apis })));
const Firestore = lazy(() => import("./pages/Firestore").then((m) => ({ default: m.Firestore })));
const Issues = lazy(() => import("./pages/Issues").then((m) => ({ default: m.Issues })));
const Errors = lazy(() => import("./pages/Errors").then((m) => ({ default: m.Errors })));

export default function App() {
  const auth = useGoogleAuth();
  const [tab, navigate] = useHash();
  const data = useGcpData(auth.user);

  const signedIn = auth.configured && auth.user;
  const fatal = data.phase === "error";
  const tokenExpired = data.errors.some((e) => /expired|expiring/i.test(e.message));

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
          {fatal && (
            <ErrorBanner
              tokenExpired={tokenExpired}
              onReauth={auth.signIn}
              onDismiss={data.refresh}
            />
          )}
          <Suspense fallback={<PageFallback />}>
            {tab === "overview" && <Overview data={data} />}
            {tab === "spend" && <Spend data={data} />}
            {tab === "projects" && <Projects data={data} />}
            {tab === "billing" && <Billing data={data} />}
            {tab === "budgets" && <Budgets data={data} />}
            {tab === "resources" && <Resources data={data} />}
            {tab === "idle" && <Idle data={data} />}
            {tab === "apis" && <Apis data={data} />}
            {tab === "firestore" && <Firestore data={data} />}
            {tab === "issues" && <Issues data={data} />}
            {tab === "errors" && <Errors data={data} />}
          </Suspense>
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

function ErrorBanner({ tokenExpired, onReauth, onDismiss }: {
  tokenExpired: boolean;
  onReauth: () => void;
  onDismiss: () => void;
}) {
  return (
    <div
      role="alert"
      className="rounded-xl p-4 mb-5 flex items-start gap-3 flex-wrap"
      style={{
        background: "rgba(220, 38, 38, 0.08)",
        border: "1px solid var(--error)",
        borderLeftWidth: 4,
      }}
    >
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm mb-1" style={{ color: "var(--error)" }}>
          {tokenExpired ? "Session expired" : "Fetch failed"}
        </div>
        <div className="text-xs" style={{ color: "var(--ink)" }}>
          {tokenExpired
            ? "Your Google access token expired mid-fetch. Sign in again to reload data."
            : "Something went wrong while fetching data. Check the Errors tab for details."}
        </div>
      </div>
      <div className="flex gap-2">
        {tokenExpired ? (
          <button
            type="button"
            onClick={onReauth}
            className="px-3 py-1.5 rounded-lg text-xs font-medium"
            style={{ background: "var(--error)", color: "white", border: 0, cursor: "pointer", fontFamily: "inherit" }}
          >
            Sign in again
          </button>
        ) : (
          <button
            type="button"
            onClick={onDismiss}
            className="px-3 py-1.5 rounded-lg text-xs font-medium"
            style={{ background: "var(--panel)", color: "var(--ink)", border: "1px solid var(--line)", cursor: "pointer", fontFamily: "inherit" }}
          >
            Retry
          </button>
        )}
      </div>
    </div>
  );
}

function PageFallback() {
  return (
    <div className="text-sm" style={{ color: "var(--muted)" }}>
      Loading...
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
