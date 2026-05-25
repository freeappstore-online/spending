import { useEffect, useRef, useState } from "react";
import type {
  DashboardData,
  EnrichedProject,
  EnrichedBillingAccount,
  ParsedBudget,
  Resource,
  ApiUsageEntry,
  FirestoreEntry,
  IdleProject,
  Issue,
  DataError,
  SignedInUser,
} from "../types";
import {
  listProjects,
  listBillingAccounts,
  getProjectBillingInfo,
  listBudgets,
  listEnabledServices,
  listAllResources,
  listFirestoreDatabases,
} from "../lib/gcp";

const EMPTY: DashboardData = {
  loading: true,
  phase: "starting",
  projects: [],
  billingAccounts: [],
  budgets: [],
  resources: [],
  resourceTypeCounts: {},
  idleProjects: [],
  apiUsage: [],
  firestore: [],
  issues: [],
  errors: [],
  budgetCoverage: { uncoveredCount: 0 },
  projectNames: {},
};

const CONCURRENCY = 6;

async function mapConcurrent<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let idx = 0;
  async function worker() {
    while (idx < items.length) {
      const i = idx++;
      results[i] = await fn(items[i]!);
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, items.length) }, worker));
  return results;
}

export function useGcpData(user: SignedInUser | null): DashboardData {
  const [data, setData] = useState<DashboardData>(EMPTY);
  const runRef = useRef(0);

  useEffect(() => {
    if (!user) {
      setData(EMPTY);
      return;
    }
    const run = ++runRef.current;
    const token = user.accessToken;
    const errors: DataError[] = [];

    const alive = () => run === runRef.current;

    (async () => {
      setData((d) => ({ ...d, loading: true, phase: "Fetching projects and billing accounts..." }));

      // Phase 1: projects + billing accounts in parallel
      const [rawProjects, rawBilling] = await Promise.all([
        listProjects(token).catch((e) => {
          errors.push({ context: "projects.list", message: String(e) });
          return [];
        }),
        listBillingAccounts(token).catch((e) => {
          errors.push({ context: "billingAccounts.list", message: String(e) });
          return [];
        }),
      ]);

      if (!alive()) return;

      const activeProjects = rawProjects.filter((p) => p.lifecycleState === "ACTIVE");

      setData((d) => ({
        ...d,
        phase: `Fetching billing info for ${activeProjects.length} projects...`,
      }));

      // Phase 2: per-project billing info
      const billingInfos = await mapConcurrent(activeProjects, (p) =>
        getProjectBillingInfo(token, p.projectId),
      );
      if (!alive()) return;

      // Phase 3: budgets per billing account
      setData((d) => ({ ...d, phase: "Fetching budgets..." }));

      const allBudgets: ParsedBudget[] = [];
      const billingAccountBudgets = new Map<string, ParsedBudget[]>();

      await mapConcurrent(rawBilling, async (ba) => {
        const baId = ba.name.replace("billingAccounts/", "");
        const budgets = await listBudgets(token, baId, ba.displayName);
        billingAccountBudgets.set(baId, budgets);
        allBudgets.push(...budgets);
      });
      if (!alive()) return;

      // Phase 4: per-project details (APIs, resources, Firestore) - parallel with concurrency limit
      setData((d) => ({
        ...d,
        phase: `Fetching details for ${activeProjects.length} projects...`,
      }));

      const projectServices = new Map<string, string[]>();
      const allResources: Resource[] = [];
      const allFirestore: FirestoreEntry[] = [];

      await mapConcurrent(activeProjects, async (p) => {
        const [services, resources, fsDbs] = await Promise.all([
          listEnabledServices(token, p.projectId).catch((e) => {
            errors.push({
              context: `services.list(${p.projectId})`,
              message: String(e),
            });
            return [];
          }),
          listAllResources(token, p.projectId).catch((e) => {
            errors.push({
              context: `resources(${p.projectId})`,
              message: String(e),
            });
            return [];
          }),
          listFirestoreDatabases(token, p.projectId).catch((e) => {
            errors.push({
              context: `firestore(${p.projectId})`,
              message: String(e),
            });
            return [];
          }),
        ]);
        projectServices.set(
          p.projectId,
          services.map(
            (s) =>
              s.config?.name || s.name.split("/").pop() || s.name,
          ),
        );
        allResources.push(...resources);
        if (fsDbs.length > 0) {
          allFirestore.push({ projectId: p.projectId, databases: fsDbs });
        }
      });
      if (!alive()) return;

      // --- Derive enriched data ---

      // Build billing account map
      const billingMap = new Map(
        billingInfos.map((bi) => [bi.projectId, bi]),
      );

      // Build budget coverage: which project numbers have a budget
      const coveredProjectNumbers = new Set<string>();
      const wholeAccountBudgetBAs = new Set<string>();
      for (const b of allBudgets) {
        if (b.projectNumbers.length === 0) {
          wholeAccountBudgetBAs.add(b.billingAccount);
        } else {
          b.projectNumbers.forEach((n) => coveredProjectNumbers.add(n));
        }
      }

      // Project names
      const projectNames: Record<string, string> = {};
      for (const p of rawProjects) {
        if (p.name && p.name !== p.projectId) {
          projectNames[p.projectId] = p.name;
        }
      }

      // Enriched projects
      const enrichedProjects: EnrichedProject[] = rawProjects.map((p) => {
        const bi = billingMap.get(p.projectId);
        const billingLinked = bi?.billingEnabled ?? false;
        const baId = bi?.billingAccountName?.replace("billingAccounts/", "");
        const budgetCovered =
          coveredProjectNumbers.has(p.projectNumber) ||
          (baId ? wholeAccountBudgetBAs.has(baId) : false);
        const services = projectServices.get(p.projectId) || [];
        const resources = allResources.filter((r) => r.projectId === p.projectId);
        const fsDbs =
          allFirestore.find((f) => f.projectId === p.projectId)?.databases || [];

        const idle =
          p.lifecycleState === "ACTIVE" &&
          !billingLinked &&
          resources.length === 0 &&
          fsDbs.length === 0 &&
          !budgetCovered &&
          isOlderThan6Months(p.createTime);

        return {
          ...p,
          billingLinked,
          billingAccountName: bi?.billingAccountName,
          budgetCovered,
          budgetReason: budgetCovered ? undefined : "no budget",
          idle,
          enabledServiceCount: services.length,
          resourceCount: resources.length,
          firestoreDatabases: fsDbs,
        };
      });

      // Enriched billing accounts
      const enrichedBilling: EnrichedBillingAccount[] = rawBilling.map((ba) => {
        const baId = ba.name.replace("billingAccounts/", "");
        const linked = billingInfos
          .filter((bi) => bi.billingAccountName === ba.name)
          .map((bi) => ({
            projectId: bi.projectId,
            billingEnabled: bi.billingEnabled,
          }));
        return {
          ...ba,
          id: baId,
          linkedProjects: linked,
          budgets: billingAccountBudgets.get(baId) || [],
        };
      });

      // Resource type counts
      const resourceTypeCounts: Record<string, number> = {};
      for (const r of allResources) {
        resourceTypeCounts[r.type] = (resourceTypeCounts[r.type] || 0) + 1;
      }

      // Idle projects
      const idleProjects: IdleProject[] = enrichedProjects
        .filter((p) => p.idle)
        .map((p) => ({ projectId: p.projectId, createTime: p.createTime }));

      // API usage aggregation
      const apiMap = new Map<string, { title: string; projects: Set<string> }>();
      for (const [pid, services] of projectServices) {
        for (const svc of services) {
          const svcName = svc.replace(".googleapis.com", "");
          if (!apiMap.has(svcName)) {
            apiMap.set(svcName, { title: svc, projects: new Set() });
          }
          apiMap.get(svcName)!.projects.add(pid);
        }
      }
      const apiUsage: ApiUsageEntry[] = Array.from(apiMap.entries())
        .map(([name, v]) => ({ name, title: v.title, projects: Array.from(v.projects) }))
        .sort((a, b) => b.projects.length - a.projects.length);

      // Issues detection
      const issues = detectIssues(enrichedProjects, allBudgets, allResources, idleProjects);

      // Budget coverage
      const uncoveredCount = enrichedProjects.filter(
        (p) => p.lifecycleState === "ACTIVE" && p.billingLinked && !p.budgetCovered,
      ).length;

      setData({
        loading: false,
        phase: "done",
        projects: enrichedProjects,
        billingAccounts: enrichedBilling,
        budgets: allBudgets,
        resources: allResources,
        resourceTypeCounts,
        idleProjects,
        apiUsage,
        firestore: allFirestore,
        issues,
        errors,
        budgetCoverage: { uncoveredCount },
        projectNames,
      });
    })();
  }, [user]);

  return data;
}

function isOlderThan6Months(createTime?: string): boolean {
  if (!createTime) return false;
  const created = new Date(createTime).getTime();
  const sixMonthsAgo = Date.now() - 180 * 86400000;
  return created < sixMonthsAgo;
}

function detectIssues(
  projects: EnrichedProject[],
  budgets: ParsedBudget[],
  _resources: Resource[],
  idleProjects: IdleProject[],
): Issue[] {
  const issues: Issue[] = [];

  const activeProjects = projects.filter((p) => p.lifecycleState === "ACTIVE");

  // No billing linked
  for (const p of activeProjects) {
    if (!p.billingLinked && p.resourceCount > 0) {
      issues.push({
        title: "Active project with resources but no billing",
        detail: `${p.projectId} has ${p.resourceCount} resources but no billing account linked.`,
        action: "Link a billing account or delete unused resources.",
        severity: "medium",
        category: "governance",
        estimatedMonthlyCost: 0,
        verified: true,
        projectId: p.projectId,
        consoleUrl: `https://console.cloud.google.com/billing?project=${p.projectId}`,
      });
    }
  }

  // Billing linked but no budget
  const uncoveredWithBilling = activeProjects.filter(
    (p) => p.billingLinked && !p.budgetCovered,
  );
  if (uncoveredWithBilling.length > 0) {
    issues.push({
      title: `${uncoveredWithBilling.length} projects have billing but no budget`,
      detail: `Projects without budgets can accumulate unexpected costs with no alerts.`,
      action: "Create a budget per project or a whole-account budget.",
      severity: "high",
      category: "prevent_overspend",
      estimatedMonthlyCost: 0,
      verified: true,
    });
  }

  // Budgets without thresholds
  const noThresholdBudgets = budgets.filter((b) => b.thresholds.length === 0);
  for (const b of noThresholdBudgets) {
    issues.push({
      title: `Budget "${b.displayName}" has no alert thresholds`,
      detail: "A budget without thresholds won't send email alerts when spend reaches a percentage.",
      action: "Add threshold rules (e.g. 50%, 80%, 100%) to trigger alerts.",
      severity: "medium",
      category: "prevent_overspend",
      estimatedMonthlyCost: 0,
      verified: true,
    });
  }

  // Idle projects
  for (const ip of idleProjects) {
    const age = ip.createTime
      ? Math.floor((Date.now() - new Date(ip.createTime).getTime()) / 86400000)
      : 0;
    issues.push({
      title: "Likely idle project",
      detail: `${ip.projectId} has no resources, no Firestore, no billing, no budget. Created ${age} days ago.`,
      action: "Delete or archive this project if unused.",
      severity: "low",
      category: "cleanup",
      estimatedMonthlyCost: 0,
      verified: true,
      projectId: ip.projectId,
      consoleUrl: `https://console.cloud.google.com/iam-admin/settings?project=${ip.projectId}`,
    });
  }

  // Sort by severity
  const order = { critical: 0, high: 1, medium: 2, low: 3 };
  issues.sort((a, b) => order[a.severity] - order[b.severity]);

  return issues;
}
