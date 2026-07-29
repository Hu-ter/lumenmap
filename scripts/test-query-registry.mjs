#!/usr/bin/env node

import {
  queryRegistry,
  categoryQuery,
  contractQuery,
  accountQuery,
  sorobanFunctionQuery,
  sorobanFunctionContractQuery,
  accountMetadataQuery,
} from "../lib/hubble/shared-queries.mjs";

const queryMap = {
  categoryQuery,
  contractQuery,
  accountQuery,
  sorobanFunctionQuery,
  sorobanFunctionContractQuery,
  accountMetadataQuery,
};

const registeredNames = new Set(queryRegistry.map((e) => e.name));
let failed = false;

for (const [name] of Object.entries(queryMap)) {
  if (!registeredNames.has(name)) {
    console.log(`FAIL: ${name} is exported but missing from queryRegistry`);
    failed = true;
  }
}

for (const entry of queryRegistry) {
  if (!queryMap[entry.name]) {
    console.log(`FAIL: queryRegistry has "${entry.name}" but no matching export`);
    failed = true;
  }
}

if (failed) {
  process.exit(1);
}

console.log(`ok — all ${queryRegistry.length} queries registered`);