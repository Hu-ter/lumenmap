"use client";

import { useQuery } from "@tanstack/react-query";
import { createContext, useContext, useMemo, useState } from "react";
import type { ActivityResponse, Period, SelectedNode } from "@/lib/types";

interface DashboardContextValue {
  period: Period;
  setPeriod: (period: Period) => void;
  data?: ActivityResponse;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  selectedNode: SelectedNode | null;
  setSelectedNode: (node: SelectedNode | null) => void;
}

const DashboardContext = createContext<DashboardContextValue | null>(null);

async function fetchActivity(period: Period): Promise<ActivityResponse> {
  const response = await fetch(`/api/activity?period=${period}`);
  if (!response.ok) {
    const body = (await response.json()) as { error?: string };
    throw new Error(body.error ?? "Failed to load activity data");
  }
  return response.json() as Promise<ActivityResponse>;
}

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const [period, setPeriod] = useState<Period>("7d");
  const [selectedNode, setSelectedNode] = useState<SelectedNode | null>(null);

  const query = useQuery({
    queryKey: ["activity", period],
    queryFn: () => fetchActivity(period),
    staleTime: 60_000,
  });

  const value = useMemo(
    () => ({
      period,
      setPeriod,
      data: query.data,
      isLoading: query.isLoading,
      isError: query.isError,
      error: query.error,
      selectedNode,
      setSelectedNode,
    }),
    [period, query.data, query.isLoading, query.isError, query.error, selectedNode],
  );

  return (
    <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>
  );
}

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error("useDashboard must be used within DashboardProvider");
  }
  return context;
}
