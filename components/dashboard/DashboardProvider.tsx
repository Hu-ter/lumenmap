"use client";

import { useQuery } from "@tanstack/react-query";
import { createContext, useContext, useMemo, useState } from "react";
import type { TreemapViewId } from "@/lib/constants";
import type { ActivityResponse, Period, SelectedNode } from "@/lib/types";

interface DashboardContextValue {
  period: Period;
  setPeriod: (period: Period) => void;
  treemapView: TreemapViewId;
  setTreemapView: (view: TreemapViewId) => void;
  data?: ActivityResponse;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  selectedNode: SelectedNode | null;
  setSelectedNode: (node: SelectedNode | null) => void;
}

const DashboardContext = createContext<DashboardContextValue | null>(null);

async function fetchActivity(period: Period, mockState?: string | null): Promise<ActivityResponse> {
  const url = mockState
    ? `/api/activity?period=${period}&mockState=${mockState}`
    : `/api/activity?period=${period}`;
  const response = await fetch(url);
  if (!response.ok) {
    const body = (await response.json()) as { error?: string };
    throw new Error(body.error ?? "Failed to load activity data");
  }
  return response.json() as Promise<ActivityResponse>;
}

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const [period, setPeriodState] = useState<Period>("1d");
  const [treemapView, setTreemapViewState] = useState<TreemapViewId>("events");

  const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const mockState = searchParams?.get("mockState");

  const [selectedNode, setSelectedNode] = useState<SelectedNode | null>(() => {
    if (mockState === "selected") {
      return {
        name: "Soroswap Router",
        value: 3200,
        share: 27.12,
        meta: {
          type: "contract",
          id: "CA4HEQTL2WPEUYKYKCDOHCDNIV4QHNJ7EL4J4NQ6VADP7SYHVRYZ7AW2",
          category: "soroban",
          protocol: "Soroswap",
          opCount: 3200,
        },
      };
    }
    return null;
  });

  const setPeriod = (p: Period) => {
    setPeriodState(p);
    setSelectedNode(null);
  };

  const setTreemapView = (v: TreemapViewId) => {
    setTreemapViewState(v);
    setSelectedNode(null);
  };

  const query = useQuery({
    queryKey: ["activity", period, mockState],
    queryFn: () => fetchActivity(period, mockState),
    enabled: mockState !== "loading",
    staleTime: 60_000,
  });

  const isLoading = mockState === "loading" || query.isLoading;

  const value = useMemo(
    () => ({
      period,
      setPeriod,
      treemapView,
      setTreemapView,
      data: query.data,
      isLoading,
      isError: mockState !== "loading" && query.isError,
      error: query.error,
      selectedNode,
      setSelectedNode,
    }),
    [
      period,
      treemapView,
      query.data,
      isLoading,
      mockState,
      query.isError,
      query.error,
      selectedNode,
    ],
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
