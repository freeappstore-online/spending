import { FreeAppStore } from "@freeappstore/sdk";
import { Shell } from "./components/Shell";
import { useGoogleAuth } from "./hooks/useGoogleAuth";
import { useHash } from "./hooks/useHash";
import { useGcpData } from "./hooks/useGcpData";
import { Overview } from "./pages/Overview";

void new FreeAppStore({ appId: "gcp-spending" });
import { Projects } from "./pages/Projects";
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
          {data.loading && (
            <div className="mb-4 text-sm" style={{ color: "var(--muted)" }}>
              {data.phase}
            </div>
          )}
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
