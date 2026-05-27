import { useCallback, useEffect, useState } from "react";
import type { TabId } from "../types";

const TABS: TabId[] = [
  "overview",
  "spend",
  "live",
  "projects",
  "billing",
  "budgets",
  "resources",
  "idle",
  "apis",
  "firestore",
  "issues",
  "errors",
];

function parseHash(): TabId {
  const raw = location.hash.replace("#", "") as TabId;
  return TABS.includes(raw) ? raw : "overview";
}

export function useHash(): [TabId, (tab: TabId) => void] {
  const [tab, setTab] = useState<TabId>(parseHash);

  useEffect(() => {
    const handler = () => setTab(parseHash());
    window.addEventListener("hashchange", handler);
    return () => window.removeEventListener("hashchange", handler);
  }, []);

  const navigate = useCallback((t: TabId) => {
    location.hash = t;
  }, []);

  return [tab, navigate];
}
