#!/usr/bin/env node

import { BigQuery } from "@google-cloud/bigquery";
import { queryRegistry, ACCOUNT_QUERY_TYPES } from "../lib/hubble/shared-queries.mjs";

const end = new Date().toISOString();
const start = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

const client = new BigQuery({
  projectId: process.env.GCP_PROJECT_ID ?? "stellar-501912",
});

let failed = false;

for (const entry of queryRegistry) {
  process.stdout.write(`Testing ${entry.name}... `);
  try {
    const params = {};
    if (entry.requiredParams.includes("start")) params.start = start;
    if (entry.requiredParams.includes("end")) params.end = end;
    if (entry.requiredParams.includes("types")) params.types = ACCOUNT_QUERY_TYPES;
    if (entry.requiredParams.includes("ids")) params.ids = [];

    const [rows] = await client.query({ query: entry.sql, params });
    console.log(`ok (${rows.length} rows)`);
  } catch (error) {
    failed = true;
    console.log("FAILED");
    console.error(error instanceof Error ? error.message : error);
  }
}

if (failed) {
  process.exit(1);
}

console.log("All Hubble queries passed.");