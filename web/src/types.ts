// Google Identity Services — minimal types for the Token Client flow.
// Loaded from accounts.google.com/gsi/client via <script> in index.html.
declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient(config: TokenClientConfig): TokenClient;
          revoke(token: string, done: () => void): void;
        };
      };
    };
  }
}

export interface TokenClientConfig {
  client_id: string;
  scope: string;
  prompt?: "" | "none" | "consent" | "select_account";
  hint?: string;
  callback: (response: TokenResponse) => void;
  error_callback?: (error: { type: string; message?: string }) => void;
}

export interface TokenClient {
  requestAccessToken(overrides?: Partial<TokenClientConfig>): void;
}

export interface TokenResponse {
  access_token: string;
  expires_in: number; // seconds
  scope: string;
  token_type: "Bearer";
  error?: string;
  error_description?: string;
}

export interface SignedInUser {
  email: string;
  accessToken: string;
  expiresAt: number; // epoch ms
}

export {};
