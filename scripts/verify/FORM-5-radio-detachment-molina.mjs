#!/usr/bin/env node
/**
 * FORM-5 reproduction attempt using the bundled molina-hha-oh.json schema.
 * Toggles the conditional datagrid `formalCaregivers` (shown when
 * `formalCaregiverSupport` = Yes) and checks whether the following radio
 * `informalCaregiverSupport` keeps its label/options gap stable.
 */
import { spawn } from "child_process";
import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "../..");
const SCHEMA_PATH = path.join(PROJECT_ROOT, "src/assets/seed-schemas/molina-hha-oh.json");
const OUTPUT_DIR = path.join(PROJECT_ROOT, "scripts/verify/output");
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

function startServer() {
  const proc = spawn(
    "python3",
    ["-m", "http.server", "8766", "--directory", PROJECT_ROOT],
    { stdio: "ignore" }
  );
  return new Promise((resolve) => setTimeout(() => resolve(proc), 1000));
}

async function measureRadioGroup(page, labelText) {
  return page.evaluate((text) => {
    const container = document.getElementById("formio-container");
    const radios = Array.from(container.querySelectorAll(".formio-component-radio"));
    const target = radios.find((el) => {
      const label = el.querySelector(":scope > label") || el.querySelector("label");
      return label?.textContent?.trim().includes(text);
    });
    if (!target) throw new Error(`Radio group with label "${text}" not found`);
    const label = target.querySelector(":scope > label") || target.querySelector("label");
    const options = target.querySelector(".form-radio");
    const labelRect = label.getBoundingClientRect();
    const optionsRect = options.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const labelStyle = window.getComputedStyle(label);
    const optionsStyle = window.getComputedStyle(options);
    return {
      label: {
        top: labelRect.top,
        left: labelRect.left,
        bottom: labelRect.bottom,
        height: labelRect.height,
        position: labelStyle.position,
      },
      options: {
        top: optionsRect.top,
        left: optionsRect.left,
        bottom: optionsRect.bottom,
        height: optionsRect.height,
        position: optionsStyle.position,
      },
      containerTop: containerRect.top,
      gap: optionsRect.top - labelRect.bottom,
    };
  }, labelText);
}

async function screenshot(page, name) {
  const p = path.join(OUTPUT_DIR, `FORM-5-molina-${name}.png`);
  await page.screenshot({ path: p, fullPage: true });
  return p;
}

async function main() {
  const server = await startServer();
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 375, height: 812 } });
    const page = await context.newPage();

    await page.goto(
      `http://localhost:8766/scripts/verify/form-harness.html?nocache=${Date.now()}`
    );
    await page.waitForFunction(() => typeof window.renderForm === "function", {
      timeout: 15000,
    });
    await page.waitForTimeout(200);

    const schema = JSON.parse(fs.readFileSync(SCHEMA_PATH, "utf-8"));
    await page.evaluate((s) => {
      window.__formReady = false;
      window.renderForm(s);
    }, schema);
    await page.waitForFunction(() => window.__formReady === true, { timeout: 15000 });
    await page.waitForTimeout(1000);

    const results = [];

    // Initial state: formalCaregiverSupport default is empty/null, so datagrid hidden.
    const before = await measureRadioGroup(page, "Informal caregiver support");
    const screenshotBefore = await screenshot(page, "datagrid-hidden");
    results.push({ state: "datagrid-hidden", ...before, screenshot: screenshotBefore });

    // Show the conditional datagrid by selecting Yes on formalCaregiverSupport.
    await page.evaluate(() => {
      const el = Array.from(document.querySelectorAll('input[type="radio"]')).find(
        (r) => r.name.includes("formalCaregiverSupport") && r.value === "Yes"
      );
      if (el) {
        el.checked = true;
        el.click();
        el.dispatchEvent(new Event("change", { bubbles: true }));
      }
    });
    await page.waitForTimeout(1200);

    const afterShown = await measureRadioGroup(page, "Informal caregiver support");
    const screenshotShown = await screenshot(page, "datagrid-shown");
    results.push({ state: "datagrid-shown", ...afterShown, screenshot: screenshotShown });

    // Collapse the datagrid again.
    await page.evaluate(() => {
      const el = Array.from(document.querySelectorAll('input[type="radio"]')).find(
        (r) => r.name.includes("formalCaregiverSupport") && r.value === "No"
      );
      if (el) {
        el.checked = true;
        el.click();
        el.dispatchEvent(new Event("change", { bubbles: true }));
      }
    });
    await page.waitForTimeout(1200);

    const afterHidden = await measureRadioGroup(page, "Informal caregiver support");
    const screenshotHidden = await screenshot(page, "datagrid-hidden-again");
    results.push({ state: "datagrid-hidden-again", ...afterHidden, screenshot: screenshotHidden });

    // Scroll then measure.
    await page.evaluate(() => window.scrollTo(0, 300));
    await page.waitForTimeout(300);
    const afterScroll = await measureRadioGroup(page, "Informal caregiver support");
    const screenshotScroll = await screenshot(page, "scroll");
    results.push({ state: "after-scroll", ...afterScroll, screenshot: screenshotScroll });

    // Resize viewport then measure.
    await page.setViewportSize({ width: 812, height: 375 });
    await page.waitForTimeout(500);
    const afterResize = await measureRadioGroup(page, "Informal caregiver support");
    const screenshotResize = await screenshot(page, "resize");
    results.push({ state: "after-resize", ...afterResize, screenshot: screenshotResize });

    const jsonPath = path.join(OUTPUT_DIR, "FORM-5-radio-detachment-molina.json");
    fs.writeFileSync(jsonPath, JSON.stringify(results, null, 2));

    console.log("\n=== FORM-5 molina-hha-oh reproduction probe ===");
    console.log(`Output: ${jsonPath}\n`);
    for (const r of results) {
      const labelRel = +(r.label.top - r.containerTop).toFixed(2);
      const optionsRel = +(r.options.top - r.containerTop).toFixed(2);
      console.log(`${r.state}:`);
      console.log(
        `  label top: ${labelRel}px  options top: ${optionsRel}px  gap: ${r.gap.toFixed(2)}px`
      );
      console.log(
        `  label position: ${r.label.position}, options position: ${r.options.position}`
      );
      console.log(`  screenshot: ${r.screenshot}`);
    }

    const baseGap = results[0].gap;
    const tolerance = 1.5;
    const consistent = results.slice(1).every((r) => Math.abs(r.gap - baseGap) < tolerance);

    if (consistent) {
      console.log("\nVERDICT: label and options move together (gap stable). Bug NOT reproduced.");
    } else {
      console.log("\nVERDICT: label/options gap changed across reflows. Bug REPRODUCED.");
      process.exitCode = 1;
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
