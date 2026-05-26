import { useCallback, useEffect, useRef, useState } from "react";
import type { SignedInUser, TokenClient, TokenResponse } from "../types";

const SCOPES = [
  "https://www.googleapis.com/auth/cloud-platform.read-only",
  "https://www.googleapis.com/auth/bigquery.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
].join(" ");

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
const SESSION_KEY = "gcp-spending-session";

export interface GoogleAuthState {
  ready: boolean;
  configured: boolean;
  user: SignedInUser | null;
  signingIn: boolean;
  error: string | null;
  signIn: () => void;
  signOut: () => void;
}

function saveSession(user: SignedInUser) {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  } catch { /* quota or private mode */ }
}

function clearSession() {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch { /* ignore */ }
}

function loadSession(): SignedInUser | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const user = JSON.parse(raw) as SignedInUser;
    if (user.expiresAt && Date.now() > user.expiresAt - 60_000) {
      clearSession();
      return null;
    }
    return user;
  } catch {
    return null;
  }
}

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
  const [user, setUser] = useState<SignedInUser | null>(loadSession);
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clientRef = useRef<TokenClient | null>(null);

  const configured = Boolean(CLIENT_ID);

  const fetchEmail = useCallback(async (token: string): Promise<string> => {
    const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`userinfo ${res.status}`);
    const data = (await res.json()) as { email?: string };
    return data.email ?? "unknown";
  }, []);

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
            const u = { email, accessToken: response.access_token, expiresAt };
            setUser(u);
            saveSession(u);
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
    clientRef.current.requestAccessToken({ prompt: user ? "" : "consent" });
  }, [user]);

  const signOut = useCallback(() => {
    if (user && window.google?.accounts.oauth2) {
      window.google.accounts.oauth2.revoke(user.accessToken, () => undefined);
    }
    setUser(null);
    clearSession();
  }, [user]);

  return { ready, configured, user, signingIn, error, signIn, signOut };
}
