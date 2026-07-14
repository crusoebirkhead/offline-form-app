#!/usr/bin/env node
/**
 * Reproduce/verify FORM-5: does a radio group's label detach from its options
 * after a layout reflow triggered by a conditional field toggle (or scroll/resize)?
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

const SCHEMA = {
  display: "form",
  components: [
    {
      type: "radio",
      key: "toggle",
      label: "Show extra field?",
      values: [
        { label: "Yes", value: "yes" },
        { label: "No", value: "no" },
      ],
      defaultValue: "no",
    },
    {
      type: "textarea",
      key: "conditionalNote",
      label:
        "Conditional note that expands and collapses to force a layout reflow",
      autoExpand: true,
      rows: 3,
      conditional: {
        show: true,
        conjunction: "all",
        conditions: [
          { component: "toggle", operator: "isEqual", value: "yes" },
        ],
      },
    },
    {
      type: "radio",
      key: "target",
      label: "Translator Required?",
      values: [
        { label: "Yes", value: "yes" },
        { label: "No", value: "no" },
      ],
    },
  ],
};

function startServer() {
  const proc = spawn(
    "python3",
    ["-m", "http.server", "8765", "--directory", PROJECT_ROOT],
    { stdio: "ignore" }
  );
  return new Promise((resolve) => setTimeout(() => resolve(proc), 1000));
}

async function measureRadioGroup(page) {
  return page.evaluate(() => {
    const container = document.getElementById("formio-container");
    const radios = Array.from(container.querySelectorAll(".formio-component-radio"));
    const target = radios.find((el) =>
      (el.querySelector(":scope > label") || el.querySelector("label"))?.textContent
        ?.trim()
        .includes("Translator Required")
    );
    if (!target) throw new Error("Target radio group not found");
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
  });
}

async function screenshot(page, name) {
  const p = path.join(OUTPUT_DIR, `FORM-5-${name}.png`);
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
      `http://localhost:8765/scripts/verify/form-harness.html?nocache=${Date.now()}`
    );
    await page.waitForFunction(() => typeof window.renderForm === "function", {
      timeout: 15000,
    });
    await page.waitForTimeout(200);

    // Render the synthetic schema.
    await page.evaluate((s) => {
      window.__formReady = false;
      window.renderForm(s);
    }, SCHEMA);
    await page.waitForFunction(() => window.__formReady === true, { timeout: 15000 });
    await page.waitForTimeout(500);

    const results = [];

    // State 1: conditional field hidden (toggle = No)
    const beforeHidden = await measureRadioGroup(page);
    const screenshotHidden = await screenshot(page, "hidden");
    results.push({ state: "conditional-hidden", ...beforeHidden, screenshot: screenshotHidden });

    // Toggle Yes -> show conditional textarea -> reflow.
    await page.locator('.formio-component-radio input[value="yes"]').first().check({ force: true });
    await page.waitForTimeout(600);

    const afterShown = await measureRadioGroup(page);
    const screenshotShown = await screenshot(page, "shown");
    results.push({ state: "conditional-shown", ...afterShown, screenshot: screenshotShown });

    // Value entry elsewhere: type into the now-visible conditional textarea so it
    // auto-expands and pushes the target radio down again.
    await page.locator('textarea.form-control').fill(
      ["Line 1", "Line 2", "Line 3", "Line 4", "Line 5", "Line 6", "Line 7", "Line 8"].join("\n")
    );
    await page.waitForTimeout(600);

    const afterTyping = await measureRadioGroup(page);
    const screenshotTyping = await screenshot(page, "typing");
    results.push({ state: "after-typing", ...afterTyping, screenshot: screenshotTyping });

    // Toggle back to No -> collapse conditional textarea -> reflow.
    await page.locator('.formio-component-radio input[value="no"]').first().check({ force: true });
    await page.waitForTimeout(600);

    const afterHiddenAgain = await measureRadioGroup(page);
    const screenshotHiddenAgain = await screenshot(page, "hidden-again");
    results.push({
      state: "conditional-hidden-again",
      ...afterHiddenAgain,
      screenshot: screenshotHiddenAgain,
    });

    // Scroll then measure (any sticky/absolute positioning would reveal drift).
    await page.evaluate(() => window.scrollTo(0, 200));
    await page.waitForTimeout(200);
    const afterScroll = await measureRadioGroup(page);
    const screenshotScroll = await screenshot(page, "scroll");
    results.push({ state: "after-scroll", ...afterScroll, screenshot: screenshotScroll });

    // Resize the viewport then measure.
    await page.setViewportSize({ width: 812, height: 375 });
    await page.waitForTimeout(400);
    const afterResize = await measureRadioGroup(page);
    const screenshotResize = await screenshot(page, "resize");
    results.push({ state: "after-resize", ...afterResize, screenshot: screenshotResize });

    const jsonPath = path.join(OUTPUT_DIR, "FORM-5-radio-detachment.json");
    fs.writeFileSync(jsonPath, JSON.stringify(results, null, 2));

    console.log("\n=== FORM-5 radio detachment probe ===");
    console.log(`Output: ${jsonPath}\n`);
    for (const r of results) {
      const labelRel = +(r.label.top - r.containerTop).toFixed(2);
      const optionsRel = +(r.options.top - r.containerTop).toFixed(2);
      console.log(`${r.state}:`);
      console.log(`  label top: ${labelRel}px  options top: ${optionsRel}px  gap: ${r.gap.toFixed(2)}px`);
      console.log(`  label position: ${r.label.position}, options position: ${r.options.position}`);
      console.log(`  screenshot: ${r.screenshot}`);
    }

    const hiddenGap = results[0].gap;
    const shownGap = results[1].gap;
    const hiddenAgainGap = results[2].gap;
    const scrollGap = results[3].gap;
    const resizeGap = results[4].gap;

    const tolerance = 1.5; // px
    const consistent =
      Math.abs(shownGap - hiddenGap) < tolerance &&
      Math.abs(hiddenAgainGap - hiddenGap) < tolerance &&
      Math.abs(scrollGap - hiddenGap) < tolerance &&
      Math.abs(resizeGap - hiddenGap) < tolerance;

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
