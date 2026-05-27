import type { SpendResult } from "../types";

export interface SpendAgg {
  byDayAll: Record<string, number>;
  byMonthAll: Record<string, number>;
  byProjectMonth: Record<string, Record<string, number>>;
  byProjectSvc: Record<string, Record<string, number>>;
  byProject7d: Record<string, number>;
  projectCurrency: Record<string, string>;
  latestDay: string;
  currency: string;
}

export function aggregateSpend(results: SpendResult[]): SpendAgg {
  const byDayAll: Record<string, number> = {};
  const byMonthAll: Record<string, number> = {};
  const byProjectMonth: Record<string, Record<string, number>> = {};
  const byProjectSvc: Record<string, Record<string, number>> = {};
  const projectCurrency: Record<string, string> = {};
  let latestDay = "";
  let currency = "";

  for (const r of results) {
    if (r.currency) currency = r.currency;

    for (const row of r.byProjectMonth) {
      const pid = row.project_id || "(unattributed)";
      const net = row.cost;
      byProjectMonth[pid] = byProjectMonth[pid] || {};
      byProjectMonth[pid][row.month] = (byProjectMonth[pid][row.month] || 0) + net;
      byMonthAll[row.month] = (byMonthAll[row.month] || 0) + net;
      if (r.currency) projectCurrency[pid] = r.currency;
    }

    for (const row of r.byProjectService) {
      const pid = row.project_id || "(unattributed)";
      const svc = row.service || "(unknown)";
      const net = row.cost + row.credits;
      byProjectSvc[pid] = byProjectSvc[pid] || {};
      byProjectSvc[pid][svc] = (byProjectSvc[pid][svc] || 0) + net;
    }

    for (const row of r.byDay) {
      const net = row.cost + row.credits;
      byDayAll[row.day] = (byDayAll[row.day] || 0) + net;
      if (row.day > latestDay) latestDay = row.day;
    }
  }

  // Per-project 7d burn approximation
  const byProject7d: Record<string, number> = {};
  for (const r of results) {
    const days = r.byDay.map((x) => x.day).sort();
    if (days.length === 0) continue;
    const last7 = new Set(days.slice(-7));
    let table7d = 0;
    for (const row of r.byDay) {
      if (last7.has(row.day)) table7d += row.cost + row.credits;
    }
    const months = [...new Set(r.byProjectMonth.map((x) => x.month))].sort();
    const latestMonth = months[months.length - 1];
    if (!latestMonth) continue;
    let tableMTD = 0;
    const projectMTD: Record<string, number> = {};
    for (const row of r.byProjectMonth) {
      if (row.month !== latestMonth) continue;
      const pid = row.project_id || "(unattributed)";
      const net = row.cost;
      projectMTD[pid] = (projectMTD[pid] || 0) + net;
      tableMTD += net;
    }
    if (tableMTD <= 0) continue;
    for (const [pid, mtd] of Object.entries(projectMTD)) {
      byProject7d[pid] = (byProject7d[pid] || 0) + (mtd / tableMTD) * table7d;
    }
  }

  return { byDayAll, byMonthAll, byProjectMonth, byProjectSvc, byProject7d, projectCurrency, latestDay, currency };
}

export function getMoneyCards(agg: SpendAgg) {
  const months = Object.keys(agg.byMonthAll).sort();
  const thisMonth = months[months.length - 1] || null;
  const lastMonth = months.length >= 2 ? months[months.length - 2] : null;
  const thisMonthTotal = thisMonth ? (agg.byMonthAll[thisMonth] ?? 0) : 0;
  const lastMonthTotal = lastMonth ? (agg.byMonthAll[lastMonth] ?? 0) : 0;
  const burn7dTotal = Object.values(agg.byProject7d).reduce((s, v) => s + v, 0);
  const avgPerDay = burn7dTotal / 7;

  let projected = 0;
  if (thisMonth) {
    const [yy, mm] = thisMonth.split("-").map(Number);
    const daysInMonth = new Date(yy!, mm!, 0).getDate();
    projected = avgPerDay * daysInMonth;
  }

  const delta = lastMonthTotal > 0
    ? ((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100
    : null;

  return { thisMonth, lastMonth, thisMonthTotal, lastMonthTotal, burn7dTotal, avgPerDay, projected, delta, currency: agg.currency };
}

export interface BleedRow {
  pid: string;
  burn7d: number;
  avg: number;
  thisM: number;
  lastM: number;
  topSvc: string;
  topSvcCost: number;
  momDelta: number | null;
}

export function getBleeds(agg: SpendAgg): BleedRow[] {
  const months = Object.keys(agg.byMonthAll).sort();
  const thisMonth = months[months.length - 1];
  const lastMonth = months.length >= 2 ? months[months.length - 2] : null;

  const allProjects = new Set([
    ...Object.keys(agg.byProject7d),
    ...Object.keys(agg.byProjectMonth),
  ]);

  const rows: BleedRow[] = [];
  for (const pid of allProjects) {
    if (pid === "(unattributed)" || !pid) continue;
    const burn7d = agg.byProject7d[pid] || 0;
    const thisM = thisMonth ? (agg.byProjectMonth[pid]?.[thisMonth] || 0) : 0;
    const lastM = lastMonth ? (agg.byProjectMonth[pid]?.[lastMonth] || 0) : 0;
    const services = agg.byProjectSvc[pid] || {};
    const topSvc = Object.entries(services).sort((a, b) => b[1] - a[1])[0];
    const momDelta = lastM > 0 ? ((thisM - lastM) / lastM) * 100 : null;
    rows.push({
      pid,
      burn7d,
      avg: burn7d / 7,
      thisM,
      lastM,
      topSvc: topSvc ? topSvc[0] : "--",
      topSvcCost: topSvc ? topSvc[1] : 0,
      momDelta,
    });
  }

  return rows
    .filter((r) => r.avg > 0.01 || r.thisM > 1 || r.lastM > 1)
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 15);
}

// --- Budget vs actual ---

export interface BudgetActual {
  displayName: string;
  amount: number;
  currency: string;
  scope: string; // "whole account" or "proj-a, proj-b, ..."
  actualSpend: number;
  percentUsed: number; // 0-Infinity
  status: "ok" | "warn" | "over"; // <50%, 50-100%, >100%
}

/**
 * Compute actual spend against each budget for the current month.
 * Budgets without a known currency or no amount are skipped.
 * Budget scope is the union of: explicit projectNumbers (translated to
 * projectIds via projectNumberToId), or the whole billing account.
 */
export function computeBudgetActuals(
  budgets: {
    displayName: string;
    amount: number | null;
    currency: string;
    projectNumbers: string[];
  }[],
  agg: SpendAgg,
  projectNumberToId: Record<string, string>,
): BudgetActual[] {
  const months = Object.keys(agg.byMonthAll).sort();
  const thisMonth = months[months.length - 1];

  return budgets
    .filter((b) => b.amount != null && b.amount > 0)
    .map((b) => {
      let actualSpend = 0;
      let scope: string;
      if (b.projectNumbers.length > 0) {
        // Sum spend across the specific projects in scope, for this month
        const projectIds = b.projectNumbers.map((n) => projectNumberToId[n] || n);
        scope = projectIds.join(", ");
        if (thisMonth) {
          for (const pid of projectIds) {
            actualSpend += agg.byProjectMonth[pid]?.[thisMonth] || 0;
          }
        }
      } else {
        // Whole-account budget: sum everything for this month
        scope = "whole billing account";
        actualSpend = thisMonth ? agg.byMonthAll[thisMonth] || 0 : 0;
      }

      const amount = b.amount!;
      const percentUsed = (actualSpend / amount) * 100;
      const status: BudgetActual["status"] =
        percentUsed > 100 ? "over" : percentUsed >= 50 ? "warn" : "ok";

      return {
        displayName: b.displayName,
        amount,
        currency: b.currency,
        scope,
        actualSpend,
        percentUsed,
        status,
      };
    })
    .sort((a, b) => b.percentUsed - a.percentUsed);
}
