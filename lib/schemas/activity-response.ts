import { z } from "zod";

/** Finite number — rejects NaN and ±Infinity. */
export const finiteNumberSchema = z.number().finite();

/** ISO-8601 timestamp string that parses to a real date. */
export const isoTimestampSchema = z
  .string()
  .min(1)
  .refine((value) => {
    const ms = Date.parse(value);
    return Number.isFinite(ms);
  }, { message: "Invalid ISO timestamp" });

export const periodSchema = z.enum(["1d", "7d", "30d", "month"]);

export const dataSourceSchema = z.literal("hubble");

export const treemapNodeTypeSchema = z.enum([
  "root",
  "category",
  "entity",
  "contract",
  "account",
]);

/**
 * Discriminated metric: kind implies a compatible unit.
 * Incompatible pairs (e.g. operations + percent) fail at parse time.
 */
export const operationsMetricSchema = z.object({
  kind: z.literal("operations"),
  unit: z.literal("ops"),
  value: finiteNumberSchema,
});

export const shareMetricSchema = z.object({
  kind: z.literal("share"),
  unit: z.literal("percent"),
  value: finiteNumberSchema,
});

export const entityCountMetricSchema = z.object({
  kind: z.literal("entity_count"),
  unit: z.literal("count"),
  value: finiteNumberSchema,
});

export const metricSchema = z.discriminatedUnion("kind", [
  operationsMetricSchema,
  shareMetricSchema,
  entityCountMetricSchema,
]);

export const provenanceSchema = z.object({
  source: dataSourceSchema,
  methodology: z.string().min(1),
  generatedAt: isoTimestampSchema,
});

export const categoryRowSchema = z.object({
  type_string: z.string().min(1),
  op_count: finiteNumberSchema,
});

export const contractRowSchema = z.object({
  contract_id: z.string().min(1),
  op_count: finiteNumberSchema,
});

export const accountRowSchema = z.object({
  account_id: z.string().min(1),
  type_string: z.string().min(1),
  op_count: finiteNumberSchema,
});

export const sorobanFunctionRowSchema = z.object({
  function_name: z.string().min(1),
  op_count: finiteNumberSchema,
});

export const sorobanFunctionContractRowSchema = z.object({
  function_name: z.string().min(1),
  contract_id: z.string().min(1),
  op_count: finiteNumberSchema,
});

export const activityKpisSchema = z.object({
  totalOps: operationsMetricSchema,
  sorobanShare: shareMetricSchema,
  topCategory: z.string().min(1),
  activeContracts: entityCountMetricSchema,
});

export const treemapNodeMetaSchema = z.object({
  type: treemapNodeTypeSchema,
  id: z.string().optional(),
  category: z.string().optional(),
  protocol: z.string().optional(),
  share: finiteNumberSchema.optional(),
  opCount: finiteNumberSchema.optional(),
  childCount: finiteNumberSchema.optional(),
  eventType: z.string().optional(),
});

type TreemapNodeInput = {
  id?: string;
  name: string;
  value?: number;
  color?: string;
  children?: TreemapNodeInput[];
  meta?: z.infer<typeof treemapNodeMetaSchema>;
};

export const treemapNodeSchema: z.ZodType<TreemapNodeInput> = z.lazy(() =>
  z
    .object({
      id: z.string().optional(),
      name: z.string().min(1),
      value: finiteNumberSchema.optional(),
      color: z.string().optional(),
      children: z.array(treemapNodeSchema).optional(),
      meta: treemapNodeMetaSchema.optional(),
    })
    .superRefine((node, ctx) => {
      const hasChildren =
        Array.isArray(node.children) && node.children.length > 0;
      const hasValue = node.value !== undefined;

      if (!hasChildren && !hasValue) {
        ctx.addIssue({
          code: "custom",
          message:
            "Treemap leaf node must have a finite value when it has no children",
          path: ["value"],
        });
      }

      if (
        node.meta?.type === "root" &&
        node.children !== undefined &&
        !Array.isArray(node.children)
      ) {
        ctx.addIssue({
          code: "custom",
          message: "Treemap root children must be an array",
          path: ["children"],
        });
      }
    }),
);

export const activityTreemapsSchema = z.object({
  events: treemapNodeSchema,
  actors: treemapNodeSchema,
});

/**
 * Runtime schema for the activity visualization response.
 * Public TypeScript types are derived from this schema.
 */
export const activityResponseSchema = z.object({
  period: periodSchema,
  start: isoTimestampSchema,
  end: isoTimestampSchema,
  source: dataSourceSchema,
  provenance: provenanceSchema,
  categories: z.array(categoryRowSchema),
  contracts: z.array(contractRowSchema),
  accounts: z.array(accountRowSchema),
  sorobanFunctions: z.array(sorobanFunctionRowSchema),
  sorobanFunctionContracts: z.array(sorobanFunctionContractRowSchema),
  kpis: activityKpisSchema,
  treemaps: activityTreemapsSchema,
});

export type ActivityResponse = z.infer<typeof activityResponseSchema>;
export type ActivityKpis = z.infer<typeof activityKpisSchema>;
export type ActivityProvenance = z.infer<typeof provenanceSchema>;
export type Metric = z.infer<typeof metricSchema>;
export type TreemapNode = z.infer<typeof treemapNodeSchema>;
export type Period = z.infer<typeof periodSchema>;
export type DataSource = z.infer<typeof dataSourceSchema>;
