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
  expires_in: number;
  scope: string;
  token_type: "Bearer";
  error?: string;
  error_description?: string;
}

export interface SignedInUser {
  email: string;
  accessToken: string;
  expiresAt: number;
}

// --- GCP data types ---

export interface GcpProject {
  projectId: string;
  name: string;
  projectNumber: string;
  lifecycleState: string;
  createTime?: string;
}

export interface BillingAccount {
  name: string;
  displayName: string;
  open: boolean;
  masterBillingAccount?: string;
  currencyCode?: string;
}

export interface BillingInfo {
  projectId: string;
  billingAccountName?: string;
  billingEnabled: boolean;
}

export interface Budget {
  name: string;
  displayName: string;
  budgetFilter?: {
    projects?: string[];
  };
  amount?: {
    specifiedAmount?: { currencyCode: string; units?: string; nanos?: number };
    lastPeriodAmount?: Record<string, never>;
  };
  thresholdRules?: { thresholdPercent: number; spendBasis: string }[];
  billingAccountId: string;
  billingAccountDisplayName?: string;
}

export interface EnabledService {
  name: string;
  config?: {
    title?: string;
  };
}

export interface Resource {
  type: string;
  typeLabel: string;
  name: string;
  projectId: string;
  zone?: string;
  region?: string;
  location?: string;
  status?: string;
  state?: string;
  machineType?: string;
  tier?: string;
  databaseVersion?: string;
  runtime?: string;
  storageClass?: string;
  currentNodeCount?: number;
  url?: string;
}

export interface FirestoreDatabase {
  name: string;
  locationId: string;
  type: string;
}

export interface FirestoreEntry {
  projectId: string;
  databases: FirestoreDatabase[];
}

export interface ApiUsageEntry {
  name: string;
  title: string;
  projects: string[];
}

export interface IdleProject {
  projectId: string;
  createTime?: string;
}

export interface Issue {
  title: string;
  detail: string;
  action: string;
  severity: "critical" | "high" | "medium" | "low";
  category: "stop_bleeding" | "prevent_overspend" | "cleanup" | "governance";
  estimatedMonthlyCost: number;
  verified: boolean;
  projectId?: string;
  consoleUrl?: string;
}

export interface DataError {
  context: string;
  message: string;
}

export interface EnrichedProject extends GcpProject {
  billingLinked: boolean;
  billingAccountName?: string;
  budgetCovered: boolean;
  budgetReason?: string;
  idle: boolean;
  enabledServiceCount: number;
  resourceCount: number;
  firestoreDatabases: FirestoreDatabase[];
}

export interface EnrichedBillingAccount extends BillingAccount {
  id: string;
  linkedProjects: { projectId: string; billingEnabled: boolean }[];
  budgets: ParsedBudget[];
}

export interface ParsedBudget {
  displayName: string;
  amount: number | null;
  currency: string;
  period: string;
  billingAccount: string;
  billingAccountDisplayName: string;
  projectNumbers: string[];
  thresholds: { percent: number }[];
}

export interface DashboardData {
  loading: boolean;
  phase: string;
  projects: EnrichedProject[];
  billingAccounts: EnrichedBillingAccount[];
  budgets: ParsedBudget[];
  resources: Resource[];
  resourceTypeCounts: Record<string, number>;
  idleProjects: IdleProject[];
  apiUsage: ApiUsageEntry[];
  firestore: FirestoreEntry[];
  issues: Issue[];
  errors: DataError[];
  budgetCoverage: { uncoveredCount: number };
  projectNames: Record<string, string>;
}

export type TabId =
  | "overview"
  | "projects"
  | "billing"
  | "budgets"
  | "resources"
  | "idle"
  | "apis"
  | "firestore"
  | "issues"
  | "errors";

export {};
