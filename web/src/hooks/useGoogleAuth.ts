import { useCallback, useEffect, useRef, useState } from "react";
import type { SignedInUser, TokenClient, TokenResponse } from "../types";

// Scopes the dashboard needs:
//  - cloud-platform.read-only : projects.list, billingAccounts, services, firestore, monitoring
//  - bigquery.readonly        : query billing-export tables
//  - userinfo.email           : show signed-in email in the sidebar
const SCOPES = [
  "https://www.googleapis.com/auth/cloud-platform.read-only",
  "https://www.googleapis.com/auth/bigquery.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
].join(" ");

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

export interface GoogleAuthState {
  ready: boolean;          // GIS script loaded
  configured: boolean;     // VITE_GOOGLE_CLIENT_ID is set
  user: SignedInUser | null;
  signingIn: boolean;
  error: string | null;
  signIn: () => void;
  signOut: () => void;
}

// Poll for window.google.accounts to appear — the GIS script is async-loaded
// from index.html so it may not be ready at first render.
function useGisReady(): boolean {
  const [ready, setReady] = useState(() => Boolean(window.google?.accounts?.oauth2));
  useEffect(() => {
    if (ready) return;
    const id = window.setInterval(() => {
      if (window.google?.accounts?.oauth2) {
        setReady(true);
        window.clearInterval(id);
      }
    }, 100);
    return () => window.clearInterval(id);
  }, [ready]);
  return ready;
}

export function useGoogleAuth(): GoogleAuthState {
  const ready = useGisReady();
  const [user, setUser] = useState<SignedInUser | null>(null);
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clientRef = useRef<TokenClient | null>(null);

  const configured = Boolean(CLIENT_ID);

  // Look up the email behind an access token. Cheap call against userinfo.
  const fetchEmail = useCallback(async (token: string): Promise<string> => {
    const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`userinfo ${res.status}`);
    const data = (await res.json()) as { email?: string };
    return data.email ?? "unknown";
  }, []);

  // Build the token client lazily, once GIS is ready and CLIENT_ID is present.
  useEffect(() => {
    if (!ready || !configured || clientRef.current) return;
    clientRef.current = window.google!.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID!,
      scope: SCOPES,
      callback: (response: TokenResponse) => {
        setSigningIn(false);
        if (response.error || !response.access_token) {
          setError(response.error_description ?? response.error ?? "Sign-in failed");
          return;
        }
        const expiresAt = Date.now() + response.expires_in * 1000;
        fetchEmail(response.access_token)
          .then((email) => {
            setUser({ email, accessToken: response.access_token, expiresAt });
            setError(null);
          })
          .catch((e: unknown) => {
            setError(e instanceof Error ? e.message : "userinfo failed");
          });
      },
      error_callback: (err) => {
        setSigningIn(false);
        setError(err.message ?? err.type);
      },
    });
  }, [ready, configured, fetchEmail]);

  const signIn = useCallback(() => {
    if (!clientRef.current) return;
    setError(null);
    setSigningIn(true);
    // 'consent' on first run so the user sees the scopes; subsequent silent
    // re-auth happens transparently via the same client.
    clientRef.current.requestAccessToken({ prompt: user ? "" : "consent" });
  }, [user]);

  const signOut = useCallback(() => {
    if (user && window.google?.accounts.oauth2) {
      window.google.accounts.oauth2.revoke(user.accessToken, () => undefined);
    }
    setUser(null);
  }, [user]);

  return { ready, configured, user, signingIn, error, signIn, signOut };
}
