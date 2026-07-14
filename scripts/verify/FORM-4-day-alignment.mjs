#!/usr/bin/env node
/**
 * Render a synthetic schema containing a Form.io `day` component alongside
 * textfield and datetime components, then measure label left offsets.
 */
import { spawn } from "child_process";
import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "../..");
const OUTPUT_DIR = path.join(PROJECT_ROOT, "scripts/verify/output");
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const schemaPath = path.join(__dirname, "synthetic-day.json");
const schema = JSON.parse(fs.readFileSync(schemaPath, "utf-8"));

function startServer() {
  const proc = spawn("python3", ["-m", "http.server", "8765", "--directory", PROJECT_ROOT], {
    stdio: "ignore",
  });
  return new Promise((resolve) => setTimeout(() => resolve(proc), 1000));
}

async function measure(page, mobile = false) {
  const viewport = mobile ? { width: 375, height: 900 } : { width: 1024, height: 900 };
  await page.setViewportSize(viewport);
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
  const html = await page.evaluate(() => document.getElementById("formio-container").innerHTML);

  const suffix = mobile ? "mobile" : "desktop";
  const screenshotPath = path.join(OUTPUT_DIR, `synthetic-day-${suffix}.png`);
  const jsonPath = path.join(OUTPUT_DIR, `synthetic-day-${suffix}.json`);
  const htmlPath = path.join(OUTPUT_DIR, `synthetic-day-${suffix}.html`);

  await page.screenshot({ path: screenshotPath, fullPage: true });
  fs.writeFileSync(jsonPath, JSON.stringify(measurements, null, 2));
  fs.writeFileSync(htmlPath, html);

  console.log(`\n=== Synthetic day schema ${suffix} ===`);
  const lefts = {};
  for (const m of measurements) {
    if (!lefts[m.type]) lefts[m.type] = new Set();
    lefts[m.type].add(Math.round((m.textLeftRelative ?? m.leftRelative) * 10) / 10);
  }
  for (const key of Object.keys(lefts).sort()) {
    console.log(`  ${key}: ${[...lefts[key]].sort((a, b) => a - b).join(", ")}`);
  }
  console.log(`  Screenshot: ${screenshotPath}`);
  console.log(`  Measurements: ${jsonPath}`);
  console.log(`  HTML: ${htmlPath}`);

  return measurements;
}

async function main() {
  const server = await startServer();
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    await measure(page, false);
    await measure(page, true);
  } finally {
    if (browser) await browser.close();
    server.kill();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
