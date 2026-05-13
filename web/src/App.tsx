import { FreeAppStore } from "@freeappstore/sdk";
import { Shell } from "./components/Shell";
import { useGoogleAuth } from "./hooks/useGoogleAuth";
import { Overview } from "./pages/Overview";

// Smoke-test the public @freeappstore/sdk npm build. We don't use the SDK's
// auth/kv/rooms here (Google OAuth covers identity, no per-user server state
// yet), but importing + instantiating it proves the package resolves and
// loads in the bundle.
const fas = new FreeAppStore({ appId: "spending" });
// eslint-disable-next-line no-console
console.log("[fas] sdk loaded", { appId: "spending", instance: fas });

export default function App() {
  const auth = useGoogleAuth();

  return (
    <Shell signedInAs={auth.user?.email ?? null} onSignOut={auth.user ? auth.signOut : undefined}>
      {!auth.configured && <SetupNeeded />}
      {auth.configured && !auth.user && <SignInScreen auth={auth} />}
      {auth.configured && auth.user && <Overview user={auth.user} />}
    </Shell>
  );
}

function SetupNeeded() {
  return (
    <div style={{ maxWidth: "640px" }}>
      <h1 style={{ fontFamily: "Fraunces, serif", fontSize: "2rem", fontWeight: 800, margin: "0 0 0.5rem" }}>
        Setup needed
      </h1>
      <p style={{ color: "var(--muted)", marginBottom: "1rem" }}>
        <code>VITE_GOOGLE_CLIENT_ID</code> is missing from this build. Commit it to <code>web/.env.production</code> and push.
      </p>
    </div>
  );
}

function SignInScreen({ auth }: { auth: ReturnType<typeof useGoogleAuth> }) {
  return (
    <div style={{ maxWidth: "560px", padding: "3rem 0" }}>
      <h1 style={{ fontFamily: "Fraunces, serif", fontSize: "2.25rem", fontWeight: 800, margin: "0 0 0.75rem" }}>
        Your GCP spend, live.
      </h1>
      <p style={{ color: "var(--muted)", marginBottom: "2rem", fontSize: "1.05rem", lineHeight: 1.55 }}>
        Sign in with Google. The dashboard pulls projects, billing, budgets, APIs, Firestore, and BigQuery cost data directly from your account — no backend, no stored credentials.
      </p>
      <button
        type="button"
        onClick={auth.signIn}
        disabled={!auth.ready || auth.signingIn}
        style={{
          background: "var(--accent)",
          color: "white",
          border: 0,
          padding: "0.85rem 2rem",
          borderRadius: "0.75rem",
          fontWeight: 700,
          fontSize: "1rem",
          fontFamily: "inherit",
          cursor: auth.ready && !auth.signingIn ? "pointer" : "not-allowed",
          opacity: auth.ready && !auth.signingIn ? 1 : 0.6,
        }}
      >
        {auth.signingIn ? "Signing in…" : "Sign in with Google"}
      </button>
      {auth.error && (
        <p style={{ color: "var(--error)", marginTop: "1rem", fontSize: "0.9rem" }}>
          {auth.error}
        </p>
      )}
      <p style={{ color: "var(--muted)", marginTop: "1.5rem", fontSize: "0.85rem" }}>
        Read-only scopes: <code>cloud-platform.read-only</code> + <code>bigquery.readonly</code>.
        The access token lives in memory only and expires in 1 hour.
      </p>
    </div>
  );
}
