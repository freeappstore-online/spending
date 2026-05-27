import { describe, it, expect } from "vitest";
import { fmtMoney, fmtInt, pLabel, ageStr } from "./fmt";

describe("fmtMoney", () => {
  it("formats positive numbers to 2 decimals", () => {
    expect(fmtMoney(1234.5)).toMatch(/^1,?234\.50$/);
  });

  it("handles 0", () => {
    expect(fmtMoney(0)).toBe("0.00");
  });

  it("handles null and undefined", () => {
    expect(fmtMoney(null)).toBe("0.00");
    expect(fmtMoney(undefined)).toBe("0.00");
  });

  it("handles NaN and Infinity", () => {
    expect(fmtMoney(NaN)).toBe("0.00");
    expect(fmtMoney(Infinity)).toBe("0.00");
  });
});

describe("fmtInt", () => {
  it("rounds and adds thousands separator", () => {
    expect(fmtInt(1234.7)).toMatch(/^1,?235$/);
  });

  it("handles edge cases", () => {
    expect(fmtInt(0)).toBe("0");
    expect(fmtInt(null)).toBe("0");
    expect(fmtInt(NaN)).toBe("0");
  });
});

describe("pLabel", () => {
  it("returns the name if known", () => {
    expect(pLabel("my-id", { "my-id": "Pretty Name" })).toBe("Pretty Name");
  });

  it("falls back to the pid if no name", () => {
    expect(pLabel("my-id", {})).toBe("my-id");
  });
});

describe("ageStr", () => {
  it("returns -- with no createTime", () => {
    expect(ageStr(undefined)).toBe("--");
  });

  it("returns days for recent dates", () => {
    const tenDaysAgo = new Date(Date.now() - 10 * 86400000).toISOString();
    expect(ageStr(tenDaysAgo)).toBe("10 d");
  });

  it("returns years for old dates", () => {
    const twoYearsAgo = new Date(Date.now() - 730 * 86400000).toISOString();
    expect(ageStr(twoYearsAgo)).toMatch(/2\.0 yr/);
  });
});
