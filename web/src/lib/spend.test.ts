import { describe, it, expect } from "vitest";
import { aggregateSpend, getMoneyCards, getBleeds } from "./spend";
import type { SpendResult } from "../types";

function makeResult(overrides: Partial<SpendResult> = {}): SpendResult {
  return {
    table: { projectId: "p", datasetId: "d", tableId: "t" },
    currency: "AUD",
    totalCost: 0,
    totalCredits: 0,
    netCost: 0,
    windowDays: 60,
    byService: [],
    byProject: [],
    byDay: [],
    byMonth: [],
    byProjectMonth: [],
    byProjectService: [],
    ...overrides,
  };
}

describe("aggregateSpend", () => {
  it("returns empty agg when no results", () => {
    const agg = aggregateSpend([]);
    expect(agg.byDayAll).toEqual({});
    expect(agg.byMonthAll).toEqual({});
    expect(agg.latestDay).toBe("");
    expect(agg.currency).toBe("");
  });

  it("sums byDay across multiple tables on the same day", () => {
    const r1 = makeResult({
      byDay: [{ day: "2026-05-20", cost: 10, credits: 0 }],
    });
    const r2 = makeResult({
      byDay: [{ day: "2026-05-20", cost: 5, credits: -1 }],
    });
    const agg = aggregateSpend([r1, r2]);
    expect(agg.byDayAll["2026-05-20"]).toBe(14); // 10 + 5 - 1
  });

  it("tracks latestDay as the max day across all results", () => {
    const r = makeResult({
      byDay: [
        { day: "2026-05-10", cost: 1, credits: 0 },
        { day: "2026-05-15", cost: 2, credits: 0 },
        { day: "2026-05-12", cost: 3, credits: 0 },
      ],
    });
    const agg = aggregateSpend([r]);
    expect(agg.latestDay).toBe("2026-05-15");
  });

  it("aggregates byProjectMonth across tables and captures currency per project", () => {
    const r = makeResult({
      currency: "USD",
      byProjectMonth: [
        { month: "2026-05", project_id: "proj-a", cost: 100 },
        { month: "2026-05", project_id: "proj-b", cost: 50 },
        { month: "2026-04", project_id: "proj-a", cost: 80 },
      ],
    });
    const agg = aggregateSpend([r]);
    expect(agg.byProjectMonth["proj-a"]).toEqual({ "2026-05": 100, "2026-04": 80 });
    expect(agg.byProjectMonth["proj-b"]).toEqual({ "2026-05": 50 });
    expect(agg.byMonthAll["2026-05"]).toBe(150);
    expect(agg.byMonthAll["2026-04"]).toBe(80);
    expect(agg.projectCurrency["proj-a"]).toBe("USD");
  });

  it("handles unattributed project_id by bucketing under (unattributed)", () => {
    const r = makeResult({
      byProjectMonth: [{ month: "2026-05", project_id: "", cost: 25 }],
    });
    const agg = aggregateSpend([r]);
    expect(agg.byProjectMonth["(unattributed)"]?.["2026-05"]).toBe(25);
  });

  it("approximates byProject7d using the per-project share of MTD * table 7d", () => {
    // Two projects share MTD spend 50/50, table 7d total is 14
    // Each project should get ~7 attributed to last 7d
    const days = [
      "2026-05-15", "2026-05-16", "2026-05-17", "2026-05-18",
      "2026-05-19", "2026-05-20", "2026-05-21",
    ];
    const r = makeResult({
      byDay: days.map((d) => ({ day: d, cost: 2, credits: 0 })),
      byProjectMonth: [
        { month: "2026-05", project_id: "proj-a", cost: 50 },
        { month: "2026-05", project_id: "proj-b", cost: 50 },
      ],
    });
    const agg = aggregateSpend([r]);
    expect(agg.byProject7d["proj-a"]).toBeCloseTo(7, 1);
    expect(agg.byProject7d["proj-b"]).toBeCloseTo(7, 1);
  });
});

describe("getMoneyCards", () => {
  it("returns zeros and null delta with no data", () => {
    const cards = getMoneyCards(aggregateSpend([]));
    expect(cards.thisMonthTotal).toBe(0);
    expect(cards.lastMonthTotal).toBe(0);
    expect(cards.delta).toBeNull();
    expect(cards.projected).toBe(0);
  });

  it("computes MoM delta as percentage when last month is non-zero", () => {
    const r = makeResult({
      byProjectMonth: [
        { month: "2026-04", project_id: "p", cost: 100 },
        { month: "2026-05", project_id: "p", cost: 150 },
      ],
    });
    const cards = getMoneyCards(aggregateSpend([r]));
    expect(cards.thisMonthTotal).toBe(150);
    expect(cards.lastMonthTotal).toBe(100);
    expect(cards.delta).toBe(50);
  });

  it("returns null delta when last month was zero (avoid /0)", () => {
    const r = makeResult({
      byProjectMonth: [{ month: "2026-05", project_id: "p", cost: 50 }],
    });
    const cards = getMoneyCards(aggregateSpend([r]));
    expect(cards.lastMonthTotal).toBe(0);
    expect(cards.delta).toBeNull();
  });

  it("projects burn rate * days-in-month", () => {
    const days = Array.from({ length: 7 }, (_, i) => `2026-05-${String(15 + i).padStart(2, "0")}`);
    const r = makeResult({
      byDay: days.map((d) => ({ day: d, cost: 10, credits: 0 })),
      byProjectMonth: [{ month: "2026-05", project_id: "p", cost: 70 }],
    });
    const cards = getMoneyCards(aggregateSpend([r]));
    // 7d total = 70, avg/day = 10, May has 31 days -> projected = 310
    expect(cards.avgPerDay).toBeCloseTo(10, 1);
    expect(cards.projected).toBeCloseTo(310, 1);
  });
});

describe("getBleeds", () => {
  it("excludes (unattributed) bucket", () => {
    const r = makeResult({
      byDay: Array.from({ length: 7 }, (_, i) => ({
        day: `2026-05-${String(15 + i).padStart(2, "0")}`,
        cost: 10,
        credits: 0,
      })),
      byProjectMonth: [
        { month: "2026-05", project_id: "", cost: 70 },
        { month: "2026-05", project_id: "real-proj", cost: 70 },
      ],
    });
    const bleeds = getBleeds(aggregateSpend([r]));
    const pids = bleeds.map((b) => b.pid);
    expect(pids).not.toContain("(unattributed)");
    expect(pids).toContain("real-proj");
  });

  it("sorts by 7d daily average descending", () => {
    const days = Array.from({ length: 7 }, (_, i) => `2026-05-${String(15 + i).padStart(2, "0")}`);
    const r = makeResult({
      byDay: days.map((d) => ({ day: d, cost: 30, credits: 0 })),
      byProjectMonth: [
        { month: "2026-05", project_id: "small", cost: 30 },   // 14% share
        { month: "2026-05", project_id: "medium", cost: 60 },  // 28%
        { month: "2026-05", project_id: "big", cost: 120 },    // 57%
      ],
    });
    const bleeds = getBleeds(aggregateSpend([r]));
    expect(bleeds.map((b) => b.pid)).toEqual(["big", "medium", "small"]);
  });

  it("computes MoM delta and topSvc", () => {
    const days = Array.from({ length: 7 }, (_, i) => `2026-05-${String(15 + i).padStart(2, "0")}`);
    const r = makeResult({
      byDay: days.map((d) => ({ day: d, cost: 10, credits: 0 })),
      byProjectMonth: [
        { month: "2026-04", project_id: "p1", cost: 50 },
        { month: "2026-05", project_id: "p1", cost: 70 },
      ],
      byProjectService: [
        { project_id: "p1", service: "Compute Engine", cost: 50, credits: 0 },
        { project_id: "p1", service: "Cloud Storage", cost: 20, credits: 0 },
      ],
    });
    const bleeds = getBleeds(aggregateSpend([r]));
    expect(bleeds[0]?.pid).toBe("p1");
    expect(bleeds[0]?.topSvc).toBe("Compute Engine");
    expect(bleeds[0]?.topSvcCost).toBe(50);
    expect(bleeds[0]?.momDelta).toBe(40); // (70-50)/50 = 40%
  });

  it("filters out projects with negligible spend (avg <= 0.01, thisM <= 1, lastM <= 1)", () => {
    const days = Array.from({ length: 7 }, (_, i) => `2026-05-${String(15 + i).padStart(2, "0")}`);
    const r = makeResult({
      byDay: days.map((d) => ({ day: d, cost: 0.001, credits: 0 })),
      byProjectMonth: [
        { month: "2026-05", project_id: "noise", cost: 0.5 },
      ],
    });
    const bleeds = getBleeds(aggregateSpend([r]));
    expect(bleeds).toHaveLength(0);
  });
});
