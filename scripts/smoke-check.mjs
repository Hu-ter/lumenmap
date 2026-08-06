#!/usr/bin/env node
/**
 * Smoke check for deployed LumenMap environments.
 * Usage: node scripts/smoke-check.mjs <deployment-url>
 * Exits 0 on success, 1 on failure.
 * Timeouts: 10s per request.
 * No sensitive data in diagnostics.
 */

const TIMEOUT_MS = 10000;

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeout);
    return res;
  } catch (err) {
    clearTimeout(timeout);
    if (err.name === 'AbortError') {
      throw new Error(`Request timed out after ${TIMEOUT_MS}ms`);
    }
    throw err;
  }
}

async function checkHomepage(baseUrl) {
  const url = baseUrl.replace(/\/$/, '');
  const res = await fetchWithTimeout(url, { method: 'GET' });
  if (!res.ok) {
    throw new Error(`Homepage: HTTP ${res.status}`);
  }
  const html = await res.text();
  if (!html.includes('<html') && !html.includes('<!DOCTYPE')) {
    throw new Error('Homepage: Invalid HTML response');
  }
  return 'Homepage OK';
}

async function checkHealth(baseUrl) {
  const url = `${baseUrl.replace(/\/$/, '')}/api/health`;
  const res = await fetchWithTimeout(url, { method: 'GET' });
  if (!res.ok) {
    throw new Error(`Health: HTTP ${res.status}`);
  }
  const json = await res.json();
  if (typeof json.status !== 'string' || json.status !== 'ok') {
    throw new Error('Health: Invalid schema (expected {status:"ok"})');
  }
  return 'Health OK';
}

async function checkActivity(baseUrl) {
  const url = `${baseUrl.replace(/\/$/, '')}/api/activity?period=1d`;
  const res = await fetchWithTimeout(url, { method: 'GET' });
  if (!res.ok) {
    throw new Error(`Activity: HTTP ${res.status}`);
  }
  const json = await res.json();
  if (!json.period || !json.kpis || typeof json.kpis.totalOps !== 'number') {
    throw new Error('Activity: Invalid schema');
  }
  return 'Activity OK';
}

async function runSmoke(deploymentUrl) {
  if (!deploymentUrl || !deploymentUrl.startsWith('http')) {
    console.error('Usage: node scripts/smoke-check.mjs <https://deployment-url>');
    process.exit(1);
  }

  console.log(`Running smoke check on: ${deploymentUrl}`);

  const checks = [
    { name: 'homepage', fn: () => checkHomepage(deploymentUrl) },
    { name: 'health', fn: () => checkHealth(deploymentUrl) },
    { name: 'activity', fn: () => checkActivity(deploymentUrl) },
  ];

  let passed = 0;
  const failures = [];

  for (const check of checks) {
    try {
      const result = await check.fn();
      console.log(`✓ ${result}`);
      passed++;
    } catch (err) {
      const msg = `${check.name}: ${err.message}`;
      console.error(`✗ ${msg}`);
      failures.push(msg);
    }
  }

  console.log(`\nSmoke check complete: ${passed}/${checks.length} passed`);

  if (failures.length > 0) {
    console.error('\nFailures:');
    failures.forEach(f => console.error(`  - ${f}`));
    process.exit(1);
  }

  console.log('All checks passed.');
  process.exit(0);
}

const url = process.argv[2];
runSmoke(url).catch(err => {
  console.error('Unexpected error:', err.message);
  process.exit(1);
});