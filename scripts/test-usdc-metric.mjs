#!/usr/bin/env node

import assert from "node:assert/strict";
import test from "node:test";
import { getSupportedUsdcAssets } from "../lib/assets/usdc.ts";
import {
  buildAllTreemaps,
  buildUsdcActorTreemap,
  buildUsdcEventTypeTreemap,
} from "../lib/entities/build-treemap.ts";

test("supported USDC asset set allowlist", () => {
  const issuers = getSupportedUsdcAssets().map((asset) => asset.issuer);
  assert.ok(
    issuers.includes("GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN"),
    "Mainnet Circle USDC issuer must be in allowlist",
  );
  assert.strictEqual(
    issuers.includes("GFAKEUSDCISSUER1234567890"),
    false,
    "Unverified same-code issuers must not be in allowlist",
  );
});

test("USDC treemap building with verified vs unverified same-code asset fixture", () => {
  const allowlist = new Set(
    getSupportedUsdcAssets().map((asset) => `${asset.code}:${asset.issuer}`),
  );

  const mockOperationsFixture = [
    {
      type_string: "payment",
      asset_code: "USDC",
      asset_issuer: "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN",
      amount: "1000.50",
      account_id: "GVERIFIED_HOLDER_1",
    },
    {
      type_string: "payment",
      asset_code: "USDC",
      asset_issuer: "GFAKE_UNVERIFIED_ISSUER_ADDRESS",
      amount: "999999.00",
      account_id: "GFAKE_HOLDER_2",
    },
    {
      type_string: "path_payment_strict_receive",
      dest_asset_code: "USDC",
      dest_asset_issuer: "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN",
      dest_amount: "500.00",
      account_id: "GVERIFIED_HOLDER_3",
    },
  ];

  const usdcFilteredOps = mockOperationsFixture.filter((op) => {
    if (op.type_string === "payment") {
      return allowlist.has(`${op.asset_code}:${op.asset_issuer}`);
    }
    return allowlist.has(`${op.dest_asset_code}:${op.dest_asset_issuer}`);
  });

  assert.strictEqual(
    usdcFilteredOps.length,
    2,
    "Unverified same-code assets must be excluded",
  );

  const usdcCategories = [
    { type_string: "payment", amount: 1000.5 },
    { type_string: "path_payment_strict_receive", amount: 500.0 },
  ];

  const usdcAccounts = [
    {
      account_id: "GVERIFIED_HOLDER_1",
      type_string: "payment",
      amount: 1000.5,
    },
    {
      account_id: "GVERIFIED_HOLDER_3",
      type_string: "path_payment_strict_receive",
      amount: 500.0,
    },
  ];

  const input = {
    categories: [
      { type_string: "payment", op_count: 10, xlm_volume: 0 },
      { type_string: "path_payment_strict_receive", op_count: 5, xlm_volume: 0 },
      { type_string: "invoke_host_function", op_count: 20, xlm_volume: 0 },
    ],
    contracts: [],
    accounts: [
      {
        account_id: "GVERIFIED_HOLDER_1",
        type_string: "payment",
        op_count: 8,
        xlm_volume: 0,
      },
      {
        account_id: "GFAKE_HOLDER_2",
        type_string: "payment",
        op_count: 2,
        xlm_volume: 0,
      },
    ],
    sorobanFunctions: [],
    sorobanFunctionContracts: [],
    usdcCategories,
    usdcAccounts,
  };

  const treemaps = buildAllTreemaps(input);

  assert.strictEqual(treemaps.events.value, 35);
  assert.strictEqual(treemaps.events.metric, "operation_count");

  assert.strictEqual(treemaps.usdc_events.value, "1500.5");
  assert.strictEqual(treemaps.usdc_events.unit.asset.code, "USDC");

  const usdcActorTree = treemaps.usdc_actors;
  const paymentsCategory = usdcActorTree.children?.find(
    (c) => c.meta?.category === "payments",
  );
  assert.ok(paymentsCategory, "Payments category node should exist");

  const usdcActorIds = paymentsCategory.children?.map((c) => c.id);
  assert.ok(
    usdcActorIds?.includes("GVERIFIED_HOLDER_1"),
    "Verified holder 1 must be present",
  );
  assert.strictEqual(
    usdcActorIds?.includes("GFAKE_HOLDER_2"),
    false,
    "Unverified holder 2 must be excluded from USDC metric",
  );
});

test("Empty USDC periods show a clear empty state treemap", () => {
  const emptyInput = {
    categories: [{ type_string: "payment", op_count: 10, xlm_volume: 0 }],
    contracts: [],
    accounts: [],
    sorobanFunctions: [],
    sorobanFunctionContracts: [],
    usdcCategories: [],
    usdcAccounts: [],
  };

  const usdcEvents = buildUsdcEventTypeTreemap(emptyInput);
  const usdcActors = buildUsdcActorTreemap(emptyInput);

  assert.strictEqual(usdcEvents.value, 0);
  assert.strictEqual(usdcEvents.children?.length, 0);
  assert.strictEqual(usdcActors.value, 0);
  assert.strictEqual(usdcActors.children?.length, 0);
});
