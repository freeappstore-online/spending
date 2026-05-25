export function fmtMoney(n: number | null | undefined): string {
  const v = Number(n || 0);
  if (!isFinite(v)) return "0.00";
  return v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function fmtInt(n: number | null | undefined): string {
  const v = Number(n || 0);
  if (!isFinite(v)) return "0";
  return Math.round(v).toLocaleString();
}

export function pLabel(
  pid: string,
  projectNames: Record<string, string>,
): string {
  return projectNames[pid] || pid;
}

export function ageDays(createTime?: string): number {
  if (!createTime) return 0;
  return Math.floor((Date.now() - new Date(createTime).getTime()) / 86400000);
}

export function ageStr(createTime?: string): string {
  const days = ageDays(createTime);
  if (days === 0) return "--";
  if (days > 365) return `${(days / 365).toFixed(1)} yr`;
  return `${days} d`;
}
