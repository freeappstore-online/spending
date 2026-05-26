export class GcpError extends Error {
  constructor(
    public status: number,
    public endpoint: string,
    message: string,
  ) {
    super(message);
    this.name = "GcpError";
  }
}

async function gcpFetch<T>(token: string, url: string): Promise<T> {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new GcpError(res.status, url, body || res.statusText);
  }
  return (await res.json()) as T;
}

// Swallow errors for per-project calls (API not enabled, permission denied, etc.)
async function gcpFetchSafe<T>(token: string, url: string, fallback: T): Promise<T> {
  try {
    return await gcpFetch<T>(token, url);
  } catch {
    return fallback;
  }
}

// --- Projects ---

export interface GcpProject {
  projectId: string;
  name: string;
  projectNumber: string;
  lifecycleState: string;
  createTime?: string;
}

interface ProjectsListResponse {
  projects?: GcpProject[];
  nextPageToken?: string;
}

export async function listProjects(token: string): Promise<GcpProject[]> {
  const all: GcpProject[] = [];
  let pageToken: string | undefined;
  do {
    const url = new URL("https://cloudresourcemanager.googleapis.com/v1/projects");
    url.searchParams.set("pageSize", "500");
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const data = await gcpFetch<ProjectsListResponse>(token, url.toString());
    if (data.projects) all.push(...data.projects);
    pageToken = data.nextPageToken;
  } while (pageToken);
  return all;
}

// --- Billing Accounts ---

export interface BillingAccount {
  name: string;
  displayName: string;
  open: boolean;
  masterBillingAccount?: string;
}

interface BillingAccountsResponse {
  billingAccounts?: BillingAccount[];
  nextPageToken?: string;
}

export async function listBillingAccounts(token: string): Promise<BillingAccount[]> {
  const all: BillingAccount[] = [];
  let pageToken: string | undefined;
  do {
    const url = new URL("https://cloudbilling.googleapis.com/v1/billingAccounts");
    url.searchParams.set("pageSize", "100");
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const data = await gcpFetch<BillingAccountsResponse>(token, url.toString());
    if (data.billingAccounts) all.push(...data.billingAccounts);
    pageToken = data.nextPageToken;
  } while (pageToken);
  return all;
}

// --- Billing Info per project ---

export interface BillingInfo {
  projectId: string;
  billingAccountName?: string;
  billingEnabled: boolean;
}

export async function getProjectBillingInfo(
  token: string,
  projectId: string,
): Promise<BillingInfo> {
  return gcpFetch<BillingInfo>(
    token,
    `https://cloudbilling.googleapis.com/v1/projects/${projectId}/billingInfo`,
  );
}

// --- Budgets ---

interface BudgetAmount {
  specifiedAmount?: { currencyCode: string; units?: string; nanos?: number };
  lastPeriodAmount?: Record<string, never>;
}

interface BudgetRaw {
  name: string;
  displayName?: string;
  budgetFilter?: { projects?: string[] };
  amount?: BudgetAmount;
  thresholdRules?: { thresholdPercent: number; spendBasis: string }[];
}

interface BudgetsResponse {
  budgets?: BudgetRaw[];
  nextPageToken?: string;
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

export async function listBudgets(
  token: string,
  billingAccountId: string,
  billingAccountDisplayName: string,
): Promise<ParsedBudget[]> {
  const all: BudgetRaw[] = [];
  let pageToken: string | undefined;
  do {
    const url = new URL(
      `https://billingbudgets.googleapis.com/v1/billingAccounts/${billingAccountId}/budgets`,
    );
    url.searchParams.set("pageSize", "100");
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const data = await gcpFetchSafe<BudgetsResponse>(token, url.toString(), {});
    if (data.budgets) all.push(...data.budgets);
    pageToken = data.nextPageToken;
  } while (pageToken);

  return all.map((b) => {
    const specAmt = b.amount?.specifiedAmount;
    const amountNum = specAmt
      ? Number(specAmt.units || 0) + (specAmt.nanos || 0) / 1e9
      : null;
    const projectNumbers = (b.budgetFilter?.projects || []).map((p) =>
      p.replace("projects/", ""),
    );
    return {
      displayName: b.displayName || "(no name)",
      amount: amountNum,
      currency: specAmt?.currencyCode || "",
      period: "MONTH",
      billingAccount: billingAccountId,
      billingAccountDisplayName,
      projectNumbers,
      thresholds: (b.thresholdRules || []).map((t) => ({
        percent: t.thresholdPercent * 100,
      })),
    };
  });
}

// --- Enabled Services ---

export interface EnabledService {
  name: string;
  config?: { title?: string; name?: string };
  state?: string;
}

interface ServicesResponse {
  services?: EnabledService[];
  nextPageToken?: string;
}

export async function listEnabledServices(
  token: string,
  projectId: string,
): Promise<EnabledService[]> {
  const all: EnabledService[] = [];
  let pageToken: string | undefined;
  do {
    const url = new URL(
      `https://serviceusage.googleapis.com/v1/projects/${projectId}/services`,
    );
    url.searchParams.set("pageSize", "200");
    url.searchParams.set("filter", "state:ENABLED");
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const data = await gcpFetchSafe<ServicesResponse>(token, url.toString(), {});
    if (data.services) all.push(...data.services);
    pageToken = data.nextPageToken;
  } while (pageToken);
  return all;
}

// --- Resources ---

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

interface ComputeInstance {
  name: string;
  zone: string;
  status: string;
  machineType: string;
  selfLink?: string;
}

interface ComputeAggregatedResponse {
  items?: Record<string, { instances?: ComputeInstance[] }>;
}

async function listComputeInstances(
  token: string,
  projectId: string,
): Promise<Resource[]> {
  const data = await gcpFetchSafe<ComputeAggregatedResponse>(
    token,
    `https://compute.googleapis.com/compute/v1/projects/${projectId}/aggregated/instances`,
    {},
  );
  const resources: Resource[] = [];
  for (const [, zoneData] of Object.entries(data.items || {})) {
    for (const inst of zoneData.instances || []) {
      resources.push({
        type: "compute_instances",
        typeLabel: "Compute VM",
        name: inst.name,
        projectId,
        zone: inst.zone?.split("/").pop(),
        status: inst.status,
        machineType: inst.machineType?.split("/").pop(),
        url: `https://console.cloud.google.com/compute/instancesDetail/zones/${inst.zone?.split("/").pop()}/instances/${inst.name}?project=${projectId}`,
      });
    }
  }
  return resources;
}

interface CloudRunService {
  name: string;
  uri?: string;
}

interface CloudRunResponse {
  services?: CloudRunService[];
}

async function listCloudRunServices(
  token: string,
  projectId: string,
): Promise<Resource[]> {
  const data = await gcpFetchSafe<CloudRunResponse>(
    token,
    `https://run.googleapis.com/v2/projects/${projectId}/locations/-/services`,
    {},
  );
  return (data.services || []).map((s) => {
    const parts = s.name.split("/");
    const region = parts[3] || "";
    const svcName = parts[parts.length - 1] || s.name;
    return {
      type: "cloud_run_services",
      typeLabel: "Cloud Run",
      name: svcName,
      projectId,
      region,
      url:
        s.uri ||
        `https://console.cloud.google.com/run/detail/${region}/${svcName}?project=${projectId}`,
    };
  });
}

interface StorageBucket {
  name: string;
  location: string;
  storageClass: string;
}

interface StorageResponse {
  items?: StorageBucket[];
}

async function listStorageBuckets(
  token: string,
  projectId: string,
): Promise<Resource[]> {
  const data = await gcpFetchSafe<StorageResponse>(
    token,
    `https://storage.googleapis.com/storage/v1/b?project=${projectId}`,
    {},
  );
  return (data.items || []).map((b) => ({
    type: "storage_buckets",
    typeLabel: "Storage bucket",
    name: b.name,
    projectId,
    location: b.location,
    storageClass: b.storageClass,
  }));
}

interface SqlInstance {
  name: string;
  region: string;
  state: string;
  databaseVersion: string;
  settings?: { tier?: string };
}

interface SqlResponse {
  items?: SqlInstance[];
}

async function listSqlInstances(
  token: string,
  projectId: string,
): Promise<Resource[]> {
  const data = await gcpFetchSafe<SqlResponse>(
    token,
    `https://sqladmin.googleapis.com/v1/projects/${projectId}/instances`,
    {},
  );
  return (data.items || []).map((i) => ({
    type: "sql_instances",
    typeLabel: "Cloud SQL",
    name: i.name,
    projectId,
    region: i.region,
    state: i.state,
    databaseVersion: i.databaseVersion,
    tier: i.settings?.tier,
    url: `https://console.cloud.google.com/sql/instances/${i.name}?project=${projectId}`,
  }));
}

export async function listAllResources(
  token: string,
  projectId: string,
): Promise<Resource[]> {
  const [compute, run, storage, sql] = await Promise.all([
    listComputeInstances(token, projectId),
    listCloudRunServices(token, projectId),
    listStorageBuckets(token, projectId),
    listSqlInstances(token, projectId),
  ]);
  return [...compute, ...run, ...storage, ...sql];
}

// --- Firestore ---

export interface FirestoreDatabase {
  name: string;
  locationId: string;
  type: string;
}

interface FirestoreResponse {
  databases?: FirestoreDatabase[];
}

export async function listFirestoreDatabases(
  token: string,
  projectId: string,
): Promise<FirestoreDatabase[]> {
  const data = await gcpFetchSafe<FirestoreResponse>(
    token,
    `https://firestore.googleapis.com/v1/projects/${projectId}/databases`,
    {},
  );
  return data.databases || [];
}
