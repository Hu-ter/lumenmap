#!/usr/bin/env node

import assert from "node:assert/strict";
import test from "node:test";
import { CANONICAL_USDC_ISSUERS } from "../lib/constants.ts";
import {
  buildAllTreemaps,
  buildUsdcActorTreemap,
  buildUsdcEventTypeTreemap,
} from "../lib/entities/build-treemap.ts";

test("CANONICAL_USDC_ISSUERS allowlist", () => {
  assert.ok(
    CANONICAL_USDC_ISSUERS.includes(
      "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN",
    ),
    "Mainnet Circle USDC issuer must be in allowlist",
  );
  assert.ok(
    CANONICAL_USDC_ISSUERS.includes(
      "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
    ),
    "Testnet Circle USDC issuer must be in allowlist",
  );
  assert.strictEqual(
    CANONICAL_USDC_ISSUERS.includes("GFAKEUSDCISSUER1234567890"),
    false,
    "Unverified same-code issuers must not be in allowlist",
  );
});

test("USDC treemap building with verified vs unverified same-code asset fixture", () => {
  const mockOperationsFixture = [
    {
      type_string: "payment",
      asset_code: "USDC",
      asset_issuer: "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN", // VERIFIED
      amount: "1000.50",
      account_id: "GVERIFIED_HOLDER_1",
    },
    {
      type_string: "payment",
      asset_code: "USDC",
      asset_issuer: "GFAKE_UNVERIFIED_ISSUER_ADDRESS", // UNVERIFIED SAME-CODE ASSET
      amount: "999999.00",
      account_id: "GFAKE_HOLDER_2",
    },
    {
      type_string: "path_payment_strict_receive",
      dest_asset_code: "USDC",
      dest_asset_issuer: "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN", // VERIFIED
      dest_amount: "500.00",
      account_id: "GVERIFIED_HOLDER_3",
    },
  ];

  // Filter fixture operations strictly using canonical USDC allowlist (mimicking BigQuery query behavior)
  const usdcFilteredOps = mockOperationsFixture.filter((op) => {
    const isStandardUsdc =
      op.type_string === "payment" &&
      op.asset_code === "USDC" &&
      CANONICAL_USDC_ISSUERS.includes(op.asset_issuer);

    const isPathUsdc =
      (op.type_string === "path_payment_strict_receive" ||
        op.type_string === "path_payment_strict_send") &&
      op.dest_asset_code === "USDC" &&
      CANONICAL_USDC_ISSUERS.includes(op.dest_asset_issuer);

    return isStandardUsdc || isPathUsdc;
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
      { type_string: "payment", op_count: 10 },
      { type_string: "path_payment_strict_receive", op_count: 5 },
      { type_string: "invoke_host_function", op_count: 20 },
    ],
    contracts: [],
    accounts: [
      { account_id: "GVERIFIED_HOLDER_1", type_string: "payment", op_count: 8 },
      { account_id: "GFAKE_HOLDER_2", type_string: "payment", op_count: 2 },
    ],
    sorobanFunctions: [],
    sorobanFunctionContracts: [],
    usdcCategories,
    usdcAccounts,
  };

  const treemaps = buildAllTreemaps(input);

  // 1. Verify Count (ops) treemap is unaffected
  assert.strictEqual(treemaps.ops.events.value, 35);
  assert.strictEqual(treemaps.ops.events.meta?.unit, "ops");

  // 2. Verify USDC treemap values and units
  assert.strictEqual(treemaps.usdc.events.value, 1500.5);
  assert.strictEqual(treemaps.usdc.events.meta?.unit, "USDC");

  // 3. Confirm unverified same-code holder GFAKE_HOLDER_2 is NOT in USDC treemap
  const usdcActorTree = treemaps.usdc.actors;
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
    categories: [{ type_string: "payment", op_count: 10 }],
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
