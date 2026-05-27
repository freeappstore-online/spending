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

// --- BigQuery (billing export discovery + cost queries) ---

const BILLING_TABLE_RE = /^gcp_billing_export_v\d+_/;

interface BqDataset {
  datasetReference: { datasetId: string };
}

interface BqTable {
  tableReference: { tableId: string };
}

export interface BillingExportTable {
  projectId: string;
  datasetId: string;
  tableId: string;
}

export async function discoverBillingExportTables(
  token: string,
  projectIds: string[],
): Promise<BillingExportTable[]> {
  const tables: BillingExportTable[] = [];
  for (const pid of projectIds) {
    const dsData = await gcpFetchSafe<{ datasets?: BqDataset[] }>(
      token,
      `https://bigquery.googleapis.com/bigquery/v2/projects/${pid}/datasets`,
      {},
    );
    for (const ds of dsData.datasets || []) {
      const dsId = ds.datasetReference.datasetId;
      const tData = await gcpFetchSafe<{ tables?: BqTable[] }>(
        token,
        `https://bigquery.googleapis.com/bigquery/v2/projects/${pid}/datasets/${dsId}/tables`,
        {},
      );
      for (const t of tData.tables || []) {
        const tid = t.tableReference.tableId;
        if (BILLING_TABLE_RE.test(tid)) {
          tables.push({ projectId: pid, datasetId: dsId, tableId: tid });
        }
      }
    }
  }
  return tables;
}

interface BqQueryResponse {
  schema?: { fields?: { name: string }[] };
  rows?: { f: { v: string | null }[] }[];
  jobComplete?: boolean;
  totalRows?: string;
}

async function bqQuery(
  token: string,
  billingProjectId: string,
  sql: string,
): Promise<Record<string, string | null>[]> {
  const url = `https://bigquery.googleapis.com/bigquery/v2/projects/${billingProjectId}/queries`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: sql, useLegacySql: false, timeoutMs: 60000 }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new GcpError(res.status, url, body || res.statusText);
  }
  const data = (await res.json()) as BqQueryResponse;
  const schema = (data.schema?.fields || []).map((f) => f.name);
  return (data.rows || []).map((row) => {
    const vals = row.f.map((c) => c.v);
    const obj: Record<string, string | null> = {};
    schema.forEach((name, i) => {
      obj[name] = vals[i] ?? null;
    });
    return obj;
  });
}

export type { SpendResult } from "../types";
import type { SpendResult } from "../types";

// --- Cloud Monitoring ---

export interface MetricConfig {
  key: string;
  label: string;
  metric: string;
  aligner: "ALIGN_SUM" | "ALIGN_MEAN" | "ALIGN_RATE";
  reducer?: "REDUCE_SUM" | "REDUCE_MEAN";
}

export const MONITORING_METRICS: MetricConfig[] = [
  { key: "firestore_reads", label: "Firestore reads", metric: "firestore.googleapis.com/document/read_count", aligner: "ALIGN_SUM", reducer: "REDUCE_SUM" },
  { key: "firestore_writes", label: "Firestore writes", metric: "firestore.googleapis.com/document/write_count", aligner: "ALIGN_SUM", reducer: "REDUCE_SUM" },
  { key: "cloud_run_requests", label: "Cloud Run requests", metric: "run.googleapis.com/request_count", aligner: "ALIGN_SUM", reducer: "REDUCE_SUM" },
  { key: "cloud_functions_executions", label: "Cloud Functions executions", metric: "cloudfunctions.googleapis.com/function/execution_count", aligner: "ALIGN_SUM", reducer: "REDUCE_SUM" },
  { key: "pubsub_messages", label: "Pub/Sub messages", metric: "pubsub.googleapis.com/subscription/sent_message_count", aligner: "ALIGN_SUM", reducer: "REDUCE_SUM" },
];

export interface MetricPoint {
  t: string; // ISO timestamp
  v: number;
}

export interface MetricSeries {
  labels: Record<string, string>;
  points: MetricPoint[];
}

interface MonitoringResponse {
  timeSeries?: {
    resource?: { labels?: Record<string, string> };
    points?: {
      interval?: { startTime?: string; endTime?: string };
      value?: { int64Value?: string; doubleValue?: number };
    }[];
  }[];
}

export async function fetchMonitoringSeries(
  token: string,
  projectId: string,
  metric: MetricConfig,
  windowHours = 48,
): Promise<MetricSeries[]> {
  const now = new Date();
  const start = new Date(now.getTime() - windowHours * 3600 * 1000);
  const params = new URLSearchParams();
  params.set("filter", `metric.type="${metric.metric}"`);
  params.set("interval.startTime", start.toISOString().replace(/\.\d{3}Z$/, "Z"));
  params.set("interval.endTime", now.toISOString().replace(/\.\d{3}Z$/, "Z"));
  params.set("aggregation.alignmentPeriod", "3600s");
  params.set("aggregation.perSeriesAligner", metric.aligner);
  if (metric.reducer) params.set("aggregation.crossSeriesReducer", metric.reducer);

  const url = `https://monitoring.googleapis.com/v3/projects/${projectId}/timeSeries?${params}`;
  const data = await gcpFetchSafe<MonitoringResponse>(token, url, {});
  if (!data.timeSeries) return [];

  return data.timeSeries.map((ts) => {
    const labels = ts.resource?.labels || {};
    const useful: Record<string, string> = {};
    for (const [k, v] of Object.entries(labels)) {
      if (k !== "project_id") useful[k] = v;
    }
    const points: MetricPoint[] = (ts.points || []).map((pt) => {
      const t = pt.interval?.endTime || pt.interval?.startTime || "";
      const v = Number(pt.value?.int64Value || pt.value?.doubleValue || 0);
      return { t, v: isFinite(v) ? v : 0 };
    }).sort((a, b) => a.t.localeCompare(b.t));
    return { labels: useful, points };
  });
}

export async function querySpendForTable(
  token: string,
  table: BillingExportTable,
  windowDays = 60,
): Promise<SpendResult> {
  const fq = `\`${table.projectId}.${table.datasetId}.${table.tableId}\``;
  const recentSince = `TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL ${windowDays} DAY)`;
  const dailySince = `TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 90 DAY)`;
  const monthlySince = `TIMESTAMP(DATE_SUB(CURRENT_DATE(), INTERVAL 12 MONTH))`;

  const [byService, byProject, byDay, byMonth, byProjectMonth, byProjectService] =
    await Promise.all([
      bqQuery(token, table.projectId, `
        SELECT service.description AS service, SUM(cost) AS cost,
               SUM(IFNULL((SELECT SUM(c.amount) FROM UNNEST(credits) c), 0)) AS credits, currency
        FROM ${fq} WHERE _PARTITIONTIME >= ${recentSince}
        GROUP BY service, currency ORDER BY cost DESC LIMIT 500
      `),
      bqQuery(token, table.projectId, `
        SELECT project.id AS project_id, SUM(cost) AS cost,
               SUM(IFNULL((SELECT SUM(c.amount) FROM UNNEST(credits) c), 0)) AS credits, currency
        FROM ${fq} WHERE _PARTITIONTIME >= ${recentSince}
        GROUP BY project_id, currency ORDER BY cost DESC LIMIT 1000
      `),
      bqQuery(token, table.projectId, `
        SELECT DATE(usage_start_time) AS day, SUM(cost) AS cost,
               SUM(IFNULL((SELECT SUM(c.amount) FROM UNNEST(credits) c), 0)) AS credits, currency
        FROM ${fq} WHERE _PARTITIONTIME >= ${dailySince}
        GROUP BY day, currency ORDER BY day
      `),
      bqQuery(token, table.projectId, `
        SELECT FORMAT_DATE('%Y-%m', DATE(usage_start_time)) AS month, SUM(cost) AS cost,
               SUM(IFNULL((SELECT SUM(c.amount) FROM UNNEST(credits) c), 0)) AS credits, currency
        FROM ${fq} WHERE _PARTITIONTIME >= ${monthlySince}
        GROUP BY month, currency ORDER BY month
      `),
      bqQuery(token, table.projectId, `
        SELECT FORMAT_DATE('%Y-%m', DATE(usage_start_time)) AS month, project.id AS project_id,
               SUM(cost) AS cost, currency
        FROM ${fq} WHERE _PARTITIONTIME >= ${monthlySince}
        GROUP BY month, project_id, currency ORDER BY month, cost DESC LIMIT 5000
      `),
      bqQuery(token, table.projectId, `
        SELECT project.id AS project_id, service.description AS service,
               SUM(cost) AS cost, SUM(IFNULL((SELECT SUM(c.amount) FROM UNNEST(credits) c), 0)) AS credits, currency
        FROM ${fq} WHERE _PARTITIONTIME >= ${recentSince}
        GROUP BY project_id, service, currency HAVING ABS(cost) > 0.001 OR ABS(credits) > 0.001
        ORDER BY project_id, cost DESC LIMIT 5000
      `),
    ]);

  const n = (v: string | null | undefined) => Number(v || 0);
  const s = (v: string | null | undefined) => v || "";
  let totalCost = 0, totalCredits = 0;
  let currency = "";
  for (const r of byService) {
    totalCost += n(r.cost);
    totalCredits += n(r.credits);
    if (r.currency) currency = r.currency;
  }

  return {
    table,
    currency,
    totalCost,
    totalCredits,
    netCost: totalCost + totalCredits,
    windowDays,
    byService: byService.map((r) => ({ service: s(r.service), cost: n(r.cost), credits: n(r.credits) })),
    byProject: byProject.map((r) => ({ project_id: s(r.project_id), cost: n(r.cost), credits: n(r.credits) })),
    byDay: byDay.map((r) => ({ day: s(r.day), cost: n(r.cost), credits: n(r.credits) })),
    byMonth: byMonth.map((r) => ({ month: s(r.month), cost: n(r.cost), credits: n(r.credits) })),
    byProjectMonth: byProjectMonth.map((r) => ({ month: s(r.month), project_id: s(r.project_id), cost: n(r.cost) })),
    byProjectService: byProjectService.map((r) => ({
      project_id: s(r.project_id), service: s(r.service), cost: n(r.cost), credits: n(r.credits),
    })),
  };
}
