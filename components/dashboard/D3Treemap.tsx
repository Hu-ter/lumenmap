"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { hierarchy, treemap, treemapSquarify } from "d3-hierarchy";
import type { HierarchyNode } from "d3-hierarchy";
import { ChevronRight } from "lucide-react";
import { CATEGORY_COLORS } from "@/lib/constants";
import type { SelectedNode, TreemapNode } from "@/lib/types";
import { formatNumber, formatPercent, truncateAddress } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useDashboard } from "@/components/dashboard/DashboardProvider";

interface D3TreemapProps {
  root: TreemapNode;
  onSelect: (node: SelectedNode) => void;
}

interface LayoutNode extends HierarchyNode<TreemapNode> {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

function resolveColor(node: TreemapNode): string {
  if (node.color) {
    return node.color;
  }

  const category = node.meta?.category;
  if (category && CATEGORY_COLORS[category]) {
    return CATEGORY_COLORS[category];
  }

  return CATEGORY_COLORS.other;
}

function getNodeValue(node: TreemapNode): number {
  return node.value ?? node.meta?.opCount ?? 0;
}

export function D3Treemap({ root, onSelect }: D3TreemapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 800, height: 480 });
  const [path, setPath] = useState<TreemapNode[]>([]);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const announcementTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { metric } = useDashboard();

  const announce = useCallback((message: string) => {
    if (announcementTimeoutRef.current) {
      clearTimeout(announcementTimeoutRef.current);
    }
    setAnnouncement("");
    announcementTimeoutRef.current = setTimeout(() => {
      setAnnouncement(message);
    }, 200);
  }, []);

  useEffect(() => {
    return () => {
      if (announcementTimeoutRef.current) {
        clearTimeout(announcementTimeoutRef.current);
      }
    };
  }, []);

  const currentNode = path.length > 0 ? path[path.length - 1] : root;
  const levelTotal = useMemo(() => {
    const children = currentNode.children ?? [];
    if (children.length > 0) {
      const childSum = children.reduce(
        (sum, child) => sum + getNodeValue(child),
        0,
      );
      if (childSum > 0) {
        return childSum;
      }
    }
    return getNodeValue(currentNode);
  }, [currentNode]);

  useEffect(() => {
    const element = chartRef.current;
    if (!element) {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) {
        return;
      }

      const { width, height } = entry.contentRect;
      setSize({
        width: Math.max(Math.floor(width), 320),
        height: Math.max(Math.floor(height), 280),
      });
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const tiles = useMemo(
    () =>
      (currentNode.children ?? []).map((child) => ({
        key: child.id ?? child.meta?.id ?? child.name,
        tile: { ...child, children: undefined } as TreemapNode,
        original: child,
      })),
    [currentNode],
  );

  const layoutRoot = useMemo(() => {
    const layoutData: TreemapNode = {
      name: currentNode.name,
      children: tiles.map((entry) => ({
        ...entry.tile,
        id: entry.key,
      })),
    };

    const rootHierarchy = hierarchy(layoutData, (node) => node.children)
      .sum((node) => getNodeValue(node))
      .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));

    treemap<TreemapNode>()
      .tile(treemapSquarify.ratio(1))
      .size([size.width, size.height])
      .paddingInner(4)
      .paddingOuter(6)
      .round(true)(rootHierarchy);

    return rootHierarchy;
  }, [currentNode.name, size.height, size.width, tiles]);

  const tileLookup = useMemo(
    () => new Map(tiles.map((entry) => [entry.key, entry.original])),
    [tiles],
  );

  const leaves = layoutRoot.leaves() as LayoutNode[];

  const handleNodeClick = useCallback(
    (node: HierarchyNode<TreemapNode>) => {
      const data = node.data;
      const original = tileLookup.get(data.id ?? data.name) ?? data;
      const value = node.value ?? 0;
      const share = levelTotal > 0 ? (value / levelTotal) * 100 : 0;

      onSelect({
        name: data.name,
        value,
        share,
        meta: {
          ...original.meta,
          type: original.meta?.type ?? "entity",
          id: original.meta?.id ?? original.id,
          opCount: value,
          childCount: original.children?.length ?? original.meta?.childCount,
        },
      });

      const unitLabel = metric === "xlm_volume" ? "XLM" : "operations";
      const childCount = original.children?.length ?? original.meta?.childCount ?? 0;
      const childrenText = childCount > 0 ? `${childCount} children available` : "no children";
      const selectionText = `Selected ${data.name}. Level ${path.length + 1}. Value: ${formatNumber(value)} ${unitLabel} (${formatPercent(share)} share of level). Available children: ${childrenText}.`;

      if (original.children && original.children.length > 0) {
        const newPath = [root, ...path, original];
        const pathString = newPath.map((n) => n.name).join(" > ");
        announce(`${selectionText} Drilled down. New path: ${pathString}.`);
        setPath((current) => [...current, original]);
      } else {
        announce(selectionText);
      }
    },
    [levelTotal, onSelect, tileLookup, path, root, announce, metric],
  );

  const navigateTo = useCallback(
    (index: number) => {
      let targetNode: TreemapNode;
      let newPath: TreemapNode[];
      if (index < 0) {
        targetNode = root;
        newPath = [root];
      } else {
        targetNode = path[index];
        newPath = [root, ...path.slice(0, index + 1)];
      }

      const value = getNodeValue(targetNode);
      const level = index < 0 ? 0 : index + 1;
      const childCount = targetNode.children?.length ?? targetNode.meta?.childCount ?? 0;
      const pathString = newPath.map((n) => n.name).join(" > ");
      const childrenText = childCount > 0 ? `${childCount} children available` : "no children";
      const unitLabel = metric === "xlm_volume" ? "XLM" : "operations";

      const announcementText = `Navigated to ${targetNode.name} via breadcrumbs. Level ${level}. Value: ${formatNumber(value)} ${unitLabel}. Current path: ${pathString}. Available children: ${childrenText}.`;
      announce(announcementText);

      if (index < 0) {
        setPath([]);
        return;
      }
      setPath((current) => current.slice(0, index + 1));
    },
    [root, path, announce, metric],
  );

  const breadcrumbs = [root, ...path];

  return (
    <div ref={containerRef} className="flex h-full min-h-0 w-full flex-col">
      <div className="mb-3 flex shrink-0 flex-wrap items-center gap-1 text-xs text-zinc-400">
        {breadcrumbs.map((crumb, index) => (
          <div key={`${crumb.name}-${index}`} className="flex items-center gap-1">
            {index > 0 ? <ChevronRight className="h-3 w-3 text-zinc-600" /> : null}
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-zinc-300 hover:text-white"
              onClick={() => navigateTo(index - 1)}
            >
              {crumb.name}
            </Button>
          </div>
        ))}
      </div>

      <div ref={chartRef} className="min-h-0 flex-1">
        <svg
          width={size.width}
          height={size.height}
          className="block overflow-hidden rounded-lg"
          role="img"
          aria-label="Network activity treemap"
        >
        {leaves.map((node) => {
          const width = node.x1 - node.x0;
          const height = node.y1 - node.y0;
          const data = node.data;
          const original = tileLookup.get(data.id ?? data.name) ?? data;
          const value = node.value ?? 0;
          const share = levelTotal > 0 ? (value / levelTotal) * 100 : 0;
          const color = resolveColor(data);
          const nodeId = `${data.id ?? data.name}-${node.x0}-${node.y0}`;
          const isHovered = hoveredId === nodeId;
          const identity = original.meta?.id ?? original.id;
          const showLabel = width > 72 && height > 44;
          const showIdentity =
            Boolean(identity) && width > 100 && height > 72 && showLabel;
          const showValue = width > 110 && height > (showIdentity ? 88 : 64);

          const canDrill = Boolean(original?.children?.length);

          const isFocused = focusedId === nodeId;

          return (
            <g
              key={nodeId}
              transform={`translate(${node.x0},${node.y0})`}
              onMouseEnter={() => setHoveredId(nodeId)}
              onMouseLeave={() => setHoveredId(null)}
              onFocus={() => setFocusedId(nodeId)}
              onBlur={() => setFocusedId(null)}
              onClick={() => handleNodeClick(node)}
              style={{ cursor: canDrill ? "zoom-in" : "pointer" }}
              tabIndex={0}
              role="button"
              aria-label={`${data.name}, Level ${path.length + 1}, ${formatNumber(value)} operations. ${canDrill ? "Has sub-items." : "Leaf node."}`}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleNodeClick(node);
                }
              }}
              className="outline-none"
            >
              <rect
                width={width}
                height={height}
                fill={color}
                stroke={isHovered || isFocused ? "#ffffff" : "#0B0E14"}
                strokeWidth={isHovered || isFocused ? 2 : 1.5}
                rx={6}
                opacity={isHovered || isFocused ? 1 : 0.92}
              />
              {showLabel ? (
                <text
                  x={10}
                  y={18}
                  fill="#ffffff"
                  fontSize={showValue ? 14 : 12}
                  fontWeight={700}
                  pointerEvents="none"
                >
                  {width < 130 && data.name.length > 14
                    ? `${data.name.slice(0, 12)}…`
                    : data.name}
                </text>
              ) : null}
              {showIdentity && identity ? (
                <text
                  x={10}
                  y={34}
                  fill="rgba(255,255,255,0.65)"
                  fontSize={10}
                  fontFamily="monospace"
                  pointerEvents="none"
                >
                  {truncateAddress(identity, 5)}
                </text>
              ) : null}
              {showValue ? (
                <>
                  <text
                    x={10}
                    y={showIdentity ? 52 : 42}
                    fill="rgba(255,255,255,0.9)"
                    fontSize={13}
                    fontWeight={600}
                    pointerEvents="none"
                  >
                    {formatNumber(value)} {metric === "xlm_volume" ? "XLM" : ""}
                  </text>
                  <text
                    x={10}
                    y={showIdentity ? 70 : 60}
                    fill="rgba(255,255,255,0.65)"
                    fontSize={11}
                    pointerEvents="none"
                  >
                    {formatPercent(share)}
                  </text>
                </>
              ) : null}
              <title>
                {identity
                  ? `${data.name}\n${identity}\n${formatNumber(value)} ${metric === "xlm_volume" ? "XLM" : "ops"} · ${formatPercent(share)}`
                  : `${data.name}\n${formatNumber(value)} ${metric === "xlm_volume" ? "XLM" : "ops"} · ${formatPercent(share)}`}
              </title>
            </g>
          );
        })}
        </svg>
      </div>

      <div
        style={{
          position: "absolute",
          width: "1px",
          height: "1px",
          padding: "0",
          margin: "-1px",
          overflow: "hidden",
          clip: "rect(0, 0, 0, 0)",
          whiteSpace: "nowrap",
          borderWidth: "0",
        }}
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {announcement}
      </div>
    </div>
  );
}
