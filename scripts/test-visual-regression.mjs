#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { spawn } from "node:child_process";
import puppeteer from "puppeteer-core";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";

const VIEWPORTS = [
  { name: "320px", width: 320, height: 1200 },
  { name: "360px", width: 360, height: 1200 },
  { name: "390px", width: 390, height: 1200 },
];

const STATES = [
  { name: "loading", url: "/?mockState=loading", waitMs: 400 },
  { name: "loaded", url: "/?mockState=loaded", waitMs: 800 },
  { name: "selected", url: "/?mockState=selected", waitMs: 800 },
  { name: "empty", url: "/?mockState=empty", waitMs: 800 },
  { name: "error", url: "/?mockState=error", waitMs: 800 },
];

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";
const PORT = new URL(BASE_URL).port || "3000";
const isUpdate = process.argv.includes("--update");

const BASELINES_DIR = path.join(process.cwd(), "tests", "visual", "baselines");
const DIFFS_DIR = path.join(process.cwd(), "tests", "visual", "diffs");

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function isServerRunning(urlStr) {
  return new Promise((resolve) => {
    const req = http.get(urlStr, (res) => {
      resolve(res.statusCode === 200 || res.statusCode === 304 || res.statusCode === 404);
    });
    req.on("error", () => resolve(false));
    req.setTimeout(1500, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function waitForServer(urlStr, maxMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    if (await isServerRunning(urlStr)) return true;
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

function getChromeExecutablePath() {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  }
  const macChrome = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  if (fs.existsSync(macChrome)) {
    return macChrome;
  }
  return undefined;
}

async function main() {
  console.log(`\n📷 Starting Mobile Visual Regression Test Suite...`);
  console.log(`   Mode: ${isUpdate ? "UPDATE BASELINES" : "VERIFY BASELINES"}\n`);

  let devServerProcess = null;
  const running = await isServerRunning(BASE_URL);

  if (!running) {
    console.log(`🚀 Starting background Next.js test server on port ${PORT}...`);
    devServerProcess = spawn("npx", ["next", "dev", "-p", PORT], {
      cwd: process.cwd(),
      env: { ...process.env, PORT, NEXT_PUBLIC_MOCK_DATA: "true" },
      shell: true,
      stdio: "ignore",
    });

    const ok = await waitForServer(BASE_URL);
    if (!ok) {
      console.error("✕ Failed to start Next.js test server.");
      if (devServerProcess) devServerProcess.kill();
      process.exit(1);
    }
  }

  const executablePath = getChromeExecutablePath();
  const browser = await puppeteer.launch({
    headless: true,
    ...(executablePath ? { executablePath } : {}),
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  let failed = false;
  let totalTests = 0;
  let passedTests = 0;

  try {
    for (const vp of VIEWPORTS) {
      const vpBaselinesDir = path.join(BASELINES_DIR, vp.name);
      const vpDiffsDir = path.join(DIFFS_DIR, vp.name);
      ensureDir(vpBaselinesDir);
      ensureDir(vpDiffsDir);

      const page = await browser.newPage();
      await page.setViewport({ width: vp.width, height: vp.height });

      for (const st of STATES) {
        totalTests++;
        const testName = `Viewport ${vp.name} | State: ${st.name}`;
        const baselinePath = path.join(vpBaselinesDir, `${st.name}.png`);
        const diffPath = path.join(vpDiffsDir, `${st.name}-diff.png`);

        try {
          await page.goto(`${BASE_URL}${st.url}`, { waitUntil: "domcontentloaded", timeout: 15000 });
          await page.addStyleTag({
            content: `
              *, *::before, *::after {
                animation: none !important;
                transition: none !important;
                caret-color: transparent !important;
              }
            `,
          });
          await new Promise((r) => setTimeout(r, st.waitMs));

          // Assertion 1: Page-level horizontal overflow check
          const overflow = await page.evaluate(() => {
            const scrollW = document.documentElement.scrollWidth;
            const clientW = document.documentElement.clientWidth;
            return {
              scrollW,
              clientW,
              isOverflowing: scrollW > window.innerWidth,
            };
          });

          if (overflow.isOverflowing) {
            throw new Error(
              `Horizontal clipping detected! Page scrollWidth (${overflow.scrollW}px) exceeds viewport width (${vp.width}px).`,
            );
          }

          // Capture current screenshot buffer with exact viewport clip dimensions
          const screenshotBuffer = await page.screenshot({
            clip: { x: 0, y: 0, width: vp.width, height: vp.height },
          });

          if (isUpdate || !fs.existsSync(baselinePath)) {
            fs.writeFileSync(baselinePath, screenshotBuffer);
            console.log(`  ✓ [SAVED BASELINE] ${testName}`);
            passedTests++;
            continue;
          }

          // Compare current screenshot against baseline using pixelmatch
          const currentPng = PNG.sync.read(screenshotBuffer);
          const baselineBuffer = fs.readFileSync(baselinePath);
          const baselinePng = PNG.sync.read(baselineBuffer);

          const { width, height } = currentPng;
          if (baselinePng.width !== width || baselinePng.height !== height) {
            throw new Error(
              `Image dimensions mismatch! Current: ${width}x${height}, Baseline: ${baselinePng.width}x${baselinePng.height}`,
            );
          }

          const diffPng = new PNG({ width, height });
          const diffPixels = pixelmatch(
            currentPng.data,
            baselinePng.data,
            diffPng.data,
            width,
            height,
            { threshold: 0.1 },
          );

          const totalPixels = width * height;
          const mismatchRatio = diffPixels / totalPixels;

          if (mismatchRatio > 0.001) {
            // Mismatch > 0.1%
            fs.writeFileSync(diffPath, PNG.sync.write(diffPng));
            throw new Error(
              `Visual difference detected! Mismatched pixels: ${diffPixels} (${(mismatchRatio * 100).toFixed(2)}%). Diff saved to: ${path.relative(process.cwd(), diffPath)}`,
            );
          }

          // Clean up any stale diff artifact if test passes
          if (fs.existsSync(diffPath)) {
            fs.unlinkSync(diffPath);
          }

          console.log(`  ✓ ${testName}`);
          passedTests++;
        } catch (err) {
          failed = true;
          console.error(`  ✕ ${testName}`);
          console.error(`    ${err.message}`);
        }
      }

      await page.close();
    }
  } finally {
    await browser.close();
    if (devServerProcess) {
      devServerProcess.kill();
    }
  }

  console.log(`\nVisual Regression Test Results: ${passedTests}/${totalTests} passed.`);

  if (failed) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal visual test runner error:", err);
  process.exit(1);
});
