#!/usr/bin/env node
/**
 * Design comparison harness: render a synthetic form that mirrors the Figma
 * mock (scripts/verify/design-ref/form-design-reference.png) so the new theme
 * can be compared field-by-field. Screenshots at phone width in a viewport-sized
 * clip so detail is legible (the full molina form is ~14000px tall).
 */
import { spawn } from "child_process";
import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "../..");
const OUTPUT_DIR = path.join(__dirname, "output");

const SCHEMA = {
  display: "form",
  components: [
    {
      type: "panel", title: "General Health", key: "generalHealth", label: "General Health",
      components: [
        { type: "number", key: "rest", label: "Rest %", input: true, placeholder: "Only Digits" },
        { type: "number", key: "active", label: "Active %", input: true, placeholder: "Only Digits" },
        {
          type: "select", key: "resp", label: "Respiration", input: true,
          data: { values: [
            { label: "Labored and requires oxygen PRN", value: "a" },
            { label: "Normal", value: "b" },
          ] },
          defaultValue: "a",
        },
        {
          type: "select", key: "postural", label: "Postural Asymmetries", input: true,
          multiple: true, description: "Select all that apply",
          data: { values: [
            { label: "Scoliosis", value: "s" },
            { label: "Thoracic Kyphosis", value: "t" },
          ] },
        },
        { type: "textarea", key: "describe", label: "Please describe", input: true, placeholder: "Anything else to add?" },
        {
          type: "radio", key: "outOfBed", label: "Was the member seen out of bed?", input: true, inline: true,
          values: [ { label: "Yes", value: "yes" }, { label: "No", value: "no" } ],
        },
        { type: "textarea", key: "why", label: "Why?", input: true, placeholder: "Anything else to add?" },
        { type: "textfield", key: "additional", label: "Additional Info", input: true, placeholder: "Anything else to add?" },
        {
          type: "selectboxes", key: "flags", label: "Flags", input: true,
          values: [ { label: "SR", value: "sr" }, { label: "N/A", value: "na" } ],
        },
        { type: "button", key: "upload", label: "Upload Media", action: "custom", theme: "primary" },
      ],
    },
  ],
};

function startServer() {
  const proc = spawn("python3", ["-m", "http.server", "8766", "--directory", PROJECT_ROOT], { stdio: "ignore" });
  return new Promise((resolve) => setTimeout(() => resolve(proc), 1000));
}

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const server = await startServer();
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await (await browser.newContext()).newPage();
    await page.setViewportSize({ width: 390, height: 1400 });
    await page.goto(`http://localhost:8766/scripts/verify/form-harness.html?nocache=${Date.now()}`);
    await page.waitForFunction(() => typeof window.renderForm === "function", { timeout: 15000 });
    await page.evaluate((s) => { window.__formReady = false; window.renderForm(s); }, SCHEMA);
    await page.waitForFunction(() => window.__formReady === true, { timeout: 15000 });
    await page.waitForTimeout(600);

    // Full synthetic form
    await page.screenshot({ path: path.join(OUTPUT_DIR, "design-compare-full.png"), fullPage: true });

    // Focused: fill one field + check a radio + a checkbox to capture
    // floated-label + selected control states (radio dot / checkbox tick).
    await page.evaluate(() => {
      const inputs = document.querySelectorAll(".formio-component-number input, .formio-component-textarea textarea");
      if (inputs[0]) inputs[0].value = "85";
      if (inputs[1]) inputs[1].value = "75";
      document.querySelectorAll(".form-control").forEach((el) => { if (!el.placeholder) el.placeholder = " "; });
      const radio = document.querySelector('.formio-component-radio input[type="radio"]');
      if (radio) radio.click();
      const cb = document.querySelector('.formio-component-selectboxes input[type="checkbox"]');
      if (cb) cb.click();
    });
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(OUTPUT_DIR, "design-compare-filled.png"), fullPage: true });

    // Tight crop around the radio + checkbox region so the dot/tick detail is legible.
    const box = await page.evaluate(() => {
      const el = document.querySelector(".formio-component-radio");
      const r = el.getBoundingClientRect();
      return { x: 0, y: Math.max(0, r.top - 10), width: 390, height: 460 };
    });
    await page.screenshot({ path: path.join(OUTPUT_DIR, "design-compare-controls.png"), clip: box });

    const h = await page.evaluate(() => document.getElementById("formio-container").scrollHeight);
    console.log(`Rendered synthetic design-compare form. Height=${h}px`);
    console.log("  -> scripts/verify/output/design-compare-full.png");
    console.log("  -> scripts/verify/output/design-compare-filled.png");
  } finally {
    if (browser) await browser.close();
    server.kill();
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
