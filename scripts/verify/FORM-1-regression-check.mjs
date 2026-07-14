#!/usr/bin/env node
/**
 * Re-verify label alignment for all bundled seed schemas plus the synthetic
 * day component fixture, using the same Playwright harness.
 */
import { spawn } from "child_process";
import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "../..");
const SCHEMA_DIR = path.join(PROJECT_ROOT, "src/assets/seed-schemas");
const OUTPUT_DIR = path.join(PROJECT_ROOT, "scripts/verify/output");
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const SCHEMAS = [
  "molina-hha-oh.json",
  "pca-service-log.json",
  "standard-assessment.json",
];

function startServer() {
  const proc = spawn("python3", ["-m", "http.server", "8765", "--directory", PROJECT_ROOT], {
    stdio: "ignore",
  });
  return new Promise((resolve) => setTimeout(() => resolve(proc), 1000));
}

async function measureSchema(page, schema, schemaName, mobile = false) {
  await page.setViewportSize({ width: mobile ? 375 : 1024, height: 1200 });
  await page.goto(`http://localhost:8765/scripts/verify/form-harness.html?nocache=${Date.now()}`);
  await page.waitForFunction(() => typeof window.renderForm === "function", { timeout: 15000 });
  await page.waitForTimeout(200);

  await page.evaluate((s) => {
    window.__formReady = false;
    window.renderForm(s);
  }, schema);
  await page.waitForFunction(() => window.__formReady === true, { timeout: 15000 });
  await page.waitForTimeout(500);

  const measurements = await page.evaluate(() => window.measureLeftEdges());

  const suffix = mobile ? "mobile" : "desktop";
  const baseName = schemaName.replace(/\.json$/, "");
  const screenshotPath = path.join(OUTPUT_DIR, `${baseName}-${suffix}.png`);
  const jsonPath = path.join(OUTPUT_DIR, `${baseName}-${suffix}.json`);

  await page.screenshot({ path: screenshotPath, fullPage: true });
  fs.writeFileSync(jsonPath, JSON.stringify(measurements, null, 2));

  const lefts = {};
  for (const m of measurements) {
    if (!lefts[m.type]) lefts[m.type] = new Set();
    lefts[m.type].add(Math.round((m.textLeftRelative ?? m.leftRelative) * 10) / 10);
  }

  console.log(`\n=== ${schemaName} ${suffix} ===`);
  for (const key of Object.keys(lefts).sort()) {
    console.log(`  ${key}: ${[...lefts[key]].sort((a, b) => a - b).join(", ")}`);
  }
  console.log(`  Screenshot: ${screenshotPath}`);

  return measurements;
}

async function main() {
  const server = await startServer();
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    for (const schemaName of SCHEMAS) {
      const schema = JSON.parse(fs.readFileSync(path.join(SCHEMA_DIR, schemaName), "utf-8"));
      try {
        await measureSchema(page, schema, schemaName, false);
        await measureSchema(page, schema, schemaName, true);
      } catch (e) {
        console.error(`ERROR measuring ${schemaName}: ${e.message}`);
      }
    }
  } finally {
    if (browser) await browser.close();
    server.kill();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
