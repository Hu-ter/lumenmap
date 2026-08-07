import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  CATEGORY_IDS,
  assertBucketReconciles,
  assertPercentageSumsTo100,
  buildCategoryLegend,
  buildCategoryShareSeries,
  mapTypeToCategory,
  toPercentageCategories,
} from "@/lib/charts/category-share";
import { getFixtureCategoryShareSeries } from "@/lib/charts/category-share-fixture";
import { CATEGORY_COLORS, GROUP_LABELS } from "@/lib/constants";

describe("mapTypeToCategory", () => {
  it("maps known types and unknown types to other", () => {
    assert.equal(mapTypeToCategory("payment"), "payments");
    assert.equal(mapTypeToCategory("invoke_host_function"), "soroban");
    assert.equal(mapTypeToCategory("weird_custom_op"), "other");
    assert.equal(mapTypeToCategory("inflation"), "other");
  });
});

describe("buildCategoryShareSeries", () => {
  const now = new Date("2026-07-28T15:30:00.000Z");
  const start = new Date("2026-07-28T00:00:00.000Z");
  const end = new Date("2026-07-28T23:59:59.999Z");

  it("reconciles category totals with bucket totals", () => {
    const series = getFixtureCategoryShareSeries("1d", now);
    assert.ok(series.buckets.length > 0);
    for (const bucket of series.buckets) {
      assert.equal(assertBucketReconciles(bucket), true);
    }
  });

  it("maps unknown categories into Other and keeps legend order stable", () => {
    const series = getFixtureCategoryShareSeries("1d", now);
    const hour2 = series.buckets.find(
      (bucket) => bucket.bucketStart === "2026-07-28T02:00:00.000Z",
    );
    assert.ok(hour2);
    assert.equal(hour2.categories.other, 20);
    assert.equal(hour2.categories.payments, 80);
    assert.deepEqual(
      series.legend.map((item) => item.id),
      [...CATEGORY_IDS],
    );
    for (const item of series.legend) {
      assert.equal(item.color, CATEGORY_COLORS[item.id]);
      assert.equal(item.label, GROUP_LABELS[item.id]);
    }
  });

  it("retains empty buckets between activity", () => {
    const series = getFixtureCategoryShareSeries("1d", now);
    const hour3 = series.buckets.find(
      (bucket) => bucket.bucketStart === "2026-07-28T03:00:00.000Z",
    );
    assert.ok(hour3);
    assert.equal(hour3.total, 0);
    assert.equal(hour3.partial, false);
  });

  it("marks the partial final bucket", () => {
    const series = getFixtureCategoryShareSeries("1d", now);
    const last = series.buckets[series.buckets.length - 1];
    assert.equal(last.bucketStart, "2026-07-28T15:00:00.000Z");
    assert.equal(last.partial, true);
    assert.ok(series.buckets.slice(0, -1).every((bucket) => !bucket.partial));
  });

  it("percentage mode sums to 100 for non-empty buckets", () => {
    const series = getFixtureCategoryShareSeries("1d", now);
    for (const bucket of series.buckets) {
      const pct = toPercentageCategories(bucket.categories, bucket.total);
      assert.equal(
        assertPercentageSumsTo100(pct, bucket.total),
        true,
        `bucket ${bucket.bucketStart}`,
      );
    }
  });

  it("supports changing category mix across buckets", () => {
    const series = buildCategoryShareSeries({
      period: "1d",
      start,
      end,
      now,
      rows: [
        {
          bucket_start: "2026-07-28T00:00:00.000Z",
          type_string: "payment",
          op_count: 100,
        },
        {
          bucket_start: "2026-07-28T01:00:00.000Z",
          type_string: "invoke_host_function",
          op_count: 100,
        },
      ],
    });

    const first = series.buckets[0];
    const second = series.buckets[1];
    assert.equal(first.categories.payments, 100);
    assert.equal(first.categories.soroban, 0);
    assert.equal(second.categories.soroban, 100);
    assert.equal(second.categories.payments, 0);
  });
});

describe("buildCategoryLegend", () => {
  it("exposes a stable ordered legend aligned with treemap colors", () => {
    const legend = buildCategoryLegend();
    assert.deepEqual(
      legend.map((item) => item.id),
      ["soroban", "payments", "dex", "trustlines", "account", "other"],
    );
  });
});
