"use client";

import dynamic from "next/dynamic";
import type {
  ComputedNode,
  ComputedNodeWithoutStyles,
  NodeProps,
  TooltipProps,
} from "@nivo/treemap";
import { CATEGORY_COLORS } from "@/lib/constants";
import { useDashboard } from "@/components/dashboard/DashboardProvider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { SelectedNode, TreemapNode } from "@/lib/types";
import { formatNumber, formatPercent } from "@/lib/utils";

const ResponsiveTreeMap = dynamic(
  () => import("@nivo/treemap").then((module) => module.ResponsiveTreeMap),
  {
    ssr: false,
    loading: () => <Skeleton className="h-[480px] w-full rounded-xl" />,
  },
);

type NivoDatum = TreemapNode & { id: string };

function asTreemapNode(node: ComputedNode<object>): TreemapNode {
  return node.data as TreemapNode;
}

function getNodeColor(node: ComputedNodeWithoutStyles<object>): string {
  const data = asTreemapNode(node as ComputedNode<object>);
  if (data.color) {
    return data.color;
  }

  const category = data.meta?.category;
  if (category && CATEGORY_COLORS[category]) {
    return CATEGORY_COLORS[category];
  }

  return CATEGORY_COLORS.other;
}

function getNodeValue(node: ComputedNode<object>): number {
  if (typeof node.value === "number") {
    return node.value;
  }

  return asTreemapNode(node).meta?.opCount ?? 0;
}

function CustomTooltip({ node }: TooltipProps<object>) {
  const data = asTreemapNode(node);
  const value = getNodeValue(node);
  const share = data.meta?.share;

  return (
    <div className="rounded-lg border border-white/10 bg-[#12151d] px-3 py-2 shadow-xl">
      <p className="text-sm font-medium text-white">{data.name}</p>
      <p className="text-xs text-zinc-400">
        {formatNumber(value)} operations
        {share !== undefined ? ` · ${formatPercent(share)}` : ""}
      </p>
    </div>
  );
}

function CustomNodeComponent({
  node,
  onClick,
}: NodeProps<object> & {
  onClick: (node: SelectedNode) => void;
}) {
  const data = asTreemapNode(node);
  const value = getNodeValue(node);
  const shouldShowLabel = node.width > 70 && node.height > 28;

  return (
    <g
      transform={`translate(${node.x},${node.y})`}
      onClick={() =>
        onClick({
          name: data.name,
          value,
          share: data.meta?.share ?? 0,
          meta: data.meta,
        })
      }
      style={{ cursor: "pointer" }}
    >
      <rect
        width={node.width}
        height={node.height}
        fill={node.color}
        stroke="#0B0E14"
        strokeWidth={2}
        rx={4}
      />
      {shouldShowLabel ? (
        <text
          x={8}
          y={18}
          fill="#ffffff"
          fontSize={12}
          fontWeight={500}
          pointerEvents="none"
        >
          {data.name.length > 18 ? `${data.name.slice(0, 16)}...` : data.name}
        </text>
      ) : null}
    </g>
  );
}

export function NetworkTreemap() {
  const { data, isLoading, isError, error, setSelectedNode } = useDashboard();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Network Treemap</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[480px] w-full rounded-xl" />
        </CardContent>
      </Card>
    );
  }

  if (isError || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Network Treemap</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-[320px] items-center justify-center rounded-xl border border-red-500/20 bg-red-500/5 p-6 text-center text-sm text-red-200">
            {error?.message ?? "Unable to load treemap data."}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Network Treemap</CardTitle>
          <p className="text-xs text-zinc-500">
            Click a tile to inspect contract or account activity.
          </p>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[320px] sm:h-[420px] lg:h-[520px]">
          <ResponsiveTreeMap
            data={data.treemap as NivoDatum}
            identity="name"
            value="value"
            innerPadding={2}
            outerPadding={2}
            margin={{ top: 8, right: 8, bottom: 8, left: 8 }}
            labelSkipSize={12}
            parentLabelPosition="left"
            parentLabelTextColor="#e4e4e7"
            colors={getNodeColor}
            nodeOpacity={1}
            borderWidth={0}
            animate={true}
            motionConfig="gentle"
            tooltip={CustomTooltip}
            nodeComponent={(props) => (
              <CustomNodeComponent {...props} onClick={setSelectedNode} />
            )}
          />
        </div>
      </CardContent>
    </Card>
  );
}
