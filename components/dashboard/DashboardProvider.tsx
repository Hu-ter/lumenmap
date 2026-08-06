"use client";

import { useQuery } from "@tanstack/react-query";
import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { TreemapViewId } from "@/lib/constants";
import type {
  ActivityVisualizationResponse,
  ApiErrorResponse,
  DashboardMetricId,
  Period,
  SelectedNode,
} from "@/lib/types";
import {
  getMockEmptyActivity,
  getMockLoadedActivity,
} from "@/lib/hubble/fixtures";

type MockState = "loading" | "loaded" | "selected" | "empty" | "error" | null;

function readMockState(): MockState {
  if (typeof window === "undefined") return null;
  const value = new URLSearchParams(window.location.search).get("mockState");
  if (value === "loading" || value === "loaded" || value === "selected" || value === "empty" || value === "error") {
    return value;
  }
  return null;
}

interface DashboardContextValue {
  period: Period;
  setPeriod: (period: Period) => void;
  treemapView: TreemapViewId;
  setTreemapView: (view: TreemapViewId) => void;
  metric: DashboardMetricId;
  setMetric: (metric: DashboardMetricId) => void;
  data?: ActivityVisualizationResponse;
  isLoading: boolean;
  isError: boolean;
  isFetching: boolean;
  error: Error | null;
  refetch: () => Promise<unknown>;
  selectedNode: SelectedNode | null;
  setSelectedNode: (node: SelectedNode | null) => void;
  mockState: MockState;
}

const DashboardContext = createContext<DashboardContextValue | null>(null);

async function fetchActivity(
  period: Period,
): Promise<ActivityVisualizationResponse> {
  const response = await fetch(`/api/v1/activity?period=${period}`);
  if (!response.ok) {
    const body = (await response.json()) as ApiErrorResponse;
    throw new Error(body.message ?? "Failed to load activity data");
  }
  return response.json() as Promise<ActivityVisualizationResponse>;
}

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const [period, setPeriod] = useState<Period>("1d");
  const [treemapView, setTreemapView] = useState<TreemapViewId>("events");
  const [metric, setMetric] = useState<DashboardMetricId>("ops");
  const [selectedNode, setSelectedNode] = useState<SelectedNode | null>(null);
  const [mockState] = useState<MockState>(() => readMockState());

  const handleSetPeriod = useCallback((newPeriod: Period) => {
    setSelectedNode(null);
    setPeriod(newPeriod);
  }, []);

  const handleSetTreemapView = useCallback((newView: TreemapViewId) => {
    setSelectedNode(null);
    setTreemapView(newView);
  }, []);

  const handleSetMetric = useCallback((newMetric: DashboardMetricId) => {
    setSelectedNode(null);
    setMetric(newMetric);
  }, []);

  const query = useQuery({
    queryKey: ["activity", period, mockState],
    queryFn: async () => {
      if (mockState === "error") throw new Error("Mock visual-regression error");
      if (mockState === "empty") return getMockEmptyActivity(period);
      if (mockState === "loaded" || mockState === "selected") return getMockLoadedActivity(period);
      return fetchActivity(period);
    },
    enabled: mockState !== "loading",
    staleTime: 60_000,
  });

  const value = useMemo(
    () => ({
      period,
      setPeriod: handleSetPeriod,
      treemapView,
      setTreemapView: handleSetTreemapView,
      metric,
      setMetric: handleSetMetric,
      data: query.data,
      isLoading: mockState === "loading" || query.isLoading,
      isError: mockState !== "loading" && (mockState === "error" || query.isError),
      isFetching: query.isFetching,
      error: query.error,
      refetch: query.refetch,
      selectedNode,
      setSelectedNode,
      mockState,
    }),
    [
      period,
      handleSetPeriod,
      treemapView,
      handleSetTreemapView,
      metric,
      handleSetMetric,
      query.data,
      query.isLoading,
      query.isError,
      query.isFetching,
      query.error,
      query.refetch,
      selectedNode,
      mockState,
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

