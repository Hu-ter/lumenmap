"use client";

import { useQuery } from "@tanstack/react-query";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import type { TreemapViewId } from "@/lib/constants";
import { findTreemapPath, type SearchResult } from "@/lib/search";
import type { ActivityResponse, Period, SelectedNode } from "@/lib/types";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { TreemapViewId } from "@/lib/constants";
import type {
  ActivityResponse,
  ApiErrorResponse,
  MetricId,
  Period,
  SelectedNode,
} from "@/lib/types";


interface DashboardContextValue {
  period: Period;
  setPeriod: (period: Period) => void;
  treemapView: TreemapViewId;
  setTreemapView: (view: TreemapViewId) => void;
  metric: MetricId;
  setMetric: (metric: MetricId) => void;
  data?: ActivityResponse;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  selectedNode: SelectedNode | null;
  setSelectedNode: (node: SelectedNode | null) => void;
  /** Active search focus used to open treemap context. */
  focusRequest: SearchResult | null;
  selectSearchResult: (result: SearchResult) => void;
}

const DashboardContext = createContext<DashboardContextValue | null>(null);

async function fetchActivity(period: Period): Promise<ActivityResponse> {
  const response = await fetch(`/api/activity?period=${period}`);
  if (!response.ok) {
    const body = (await response.json()) as ApiErrorResponse;
    throw new Error(body.message ?? "Failed to load activity data");
  }
  return response.json() as Promise<ActivityResponse>;
}

function searchResultToSelectedNode(result: SearchResult): SelectedNode {
  return {
    name: result.label,
    value: result.opCount ?? 0,
    share: 0,
    meta: {
      type: result.nodeType,
      id: result.id ?? result.issuer,
      category: result.category,
      protocol: result.protocol,
      opCount: result.opCount,
    },
  };
}

function selectedNodeFromSearch(
  data: ActivityResponse | undefined,
  result: SearchResult,
): SelectedNode {
  const root = data?.treemaps[result.treemapView];
  if (root) {
    const path = findTreemapPath(root, result);
    if (path && path.length > 0) {
      const matched = path[path.length - 1];
      const value = matched.value ?? matched.meta?.opCount ?? result.opCount ?? 0;
      return {
        name: matched.name,
        value,
        share: matched.meta?.share ?? 0,
        meta: {
          ...matched.meta,
          type: matched.meta?.type ?? result.nodeType,
          id: matched.meta?.id ?? matched.id ?? result.id ?? result.issuer,
          opCount: value,
          childCount: matched.children?.length ?? matched.meta?.childCount,
          protocol: matched.meta?.protocol ?? result.protocol,
          category: matched.meta?.category ?? result.category,
        },
      };
    }
  }
  return searchResultToSelectedNode(result);
}

export function DashboardProvider({ children }: { children: React.ReactNode }) {

  const [period, setPeriodState] = useState<Period>("1d");
  const [treemapView, setTreemapViewState] = useState<TreemapViewId>("events");

  const [period, setPeriod] = useState<Period>("1d");
  const [treemapView, setTreemapView] = useState<TreemapViewId>("events");
  const [metric, setMetric] = useState<MetricId>("ops");

  const [selectedNode, setSelectedNode] = useState<SelectedNode | null>(null);

  const [focusRequest, setFocusRequest] = useState<SearchResult | null>(null);


  const handleSetPeriod = useCallback((newPeriod: Period) => {
    setSelectedNode(null);
    setPeriod(newPeriod);
  }, []);

  const handleSetTreemapView = useCallback((newView: TreemapViewId) => {
    setSelectedNode(null);
    setTreemapView(newView);
  }, []);


  const handleSetMetric = useCallback((newMetric: MetricId) => {
    setSelectedNode(null);
    setMetric(newMetric);
  }, []);


  const query = useQuery({
    queryKey: ["activity", period],
    queryFn: () => fetchActivity(period),
    staleTime: 60_000,
  });

  const setPeriod = useCallback((next: Period) => {
    setPeriodState(next);
    setSelectedNode(null);
    setFocusRequest(null);
  }, []);

  const setTreemapView = useCallback((view: TreemapViewId) => {
    setTreemapViewState(view);
    setSelectedNode(null);
    setFocusRequest(null);
  }, []);

  const selectSearchResult = useCallback(
    (result: SearchResult) => {
      setTreemapViewState(result.treemapView);
      setFocusRequest(result);
      setSelectedNode(selectedNodeFromSearch(query.data, result));
    },
    [query.data],
  );

  const value = useMemo(
    () => ({
      period,
      setPeriod: handleSetPeriod,
      treemapView,
      setTreemapView: handleSetTreemapView,
      metric,
      setMetric: handleSetMetric,
      data: query.data,
      isLoading: query.isLoading,
      isError: query.isError,
      error: query.error,
      selectedNode,
      setSelectedNode,
      focusRequest,
      selectSearchResult,
    }),
    [
      period,

      setPeriod,
      treemapView,
      setTreemapView,

      handleSetPeriod,
      treemapView,
      handleSetTreemapView,

      metric,
      handleSetMetric,

      query.data,
      query.isLoading,
      query.isError,
      query.error,
      selectedNode,
      focusRequest,
      selectSearchResult,
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
