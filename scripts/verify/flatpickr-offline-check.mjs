#!/usr/bin/env node
/**
 * Prove the datetime/calendar (flatpickr) works fully OFFLINE now that it is
 * bundled locally. Blocks every non-localhost request (so any cdn.form.io
 * fetch would fail), renders a datetime field, opens the calendar, and asserts
 * flatpickr loaded from the local bundle with zero external requests.
 */
import { spawn } from "child_process";
import { chromium } from "playwright";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "../..");
const OUTPUT_DIR = path.join(__dirname, "output");

const SCHEMA = { display: "form", components: [
  { type: "datetime", key: "dt", label: "Visit Date", input: true,
    format: "yyyy-MM-dd", enableTime: false, datePicker: { minDate: null, maxDate: null } },
]};

function startServer() {
  const proc = spawn("python3", ["-m", "http.server", "8768", "--directory", PROJECT_ROOT], { stdio: "ignore" });
  return new Promise((r) => setTimeout(() => r(proc), 1000));
}

async function main() {
  const server = await startServer();
  let browser;
  const externalRequests = [];
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();

    // Block everything that isn't our local server — simulate offline.
    await context.route("**/*", (route) => {
      const url = route.request().url();
      if (url.startsWith("http://localhost:8768") || url.startsWith("http://127.0.0.1:8768")) {
        return route.continue();
      }
      externalRequests.push(url);
      return route.abort();
    });

    const page = await context.newPage();
    await page.setViewportSize({ width: 390, height: 700 });
    await page.goto(`http://localhost:8768/scripts/verify/form-harness.html?n=${Date.now()}`);
    await page.waitForFunction(() => typeof window.renderForm === "function", { timeout: 15000 });
    await page.evaluate((s) => { window.__formReady = false; window.renderForm(s); }, SCHEMA);
    await page.waitForFunction(() => window.__formReady === true, { timeout: 15000 });
    await page.waitForTimeout(400);

    const flatpickrGlobal = await page.evaluate(() => typeof window.flatpickr);

    // Open the calendar. flatpickr hides the original input (type=hidden,
    // .flatpickr-input) and shows a visible "altInput" (input[type=text]);
    // click the visible one.
    await page.click(".formio-component-datetime input[type='text']");
    await page.waitForTimeout(500);

    const calendar = await page.evaluate(() => {
      const cal = document.querySelector(".flatpickr-calendar");
      return {
        present: !!cal,
        open: cal ? cal.classList.contains("open") : false,
        hasDays: cal ? cal.querySelectorAll(".flatpickr-day").length : 0,
      };
    });

    await page.screenshot({ path: path.join(OUTPUT_DIR, "flatpickr-offline.png") });

    const cdnHits = externalRequests.filter((u) => /cdn\.form\.io|flatpickr/i.test(u));
    console.log("window.flatpickr:", flatpickrGlobal);
    console.log("calendar:", JSON.stringify(calendar));
    console.log("total blocked external requests:", externalRequests.length);
    console.log("flatpickr/cdn requests attempted:", cdnHits.length, cdnHits.slice(0, 5));
    console.log("screenshot -> scripts/verify/output/flatpickr-offline.png");

    const pass = flatpickrGlobal === "function" && calendar.present && calendar.hasDays > 0 && cdnHits.length === 0;
    console.log(pass ? "\nPASS: datetime works offline from local bundle." : "\nFAIL: see above.");
    process.exitCode = pass ? 0 : 1;
  } finally {
    if (browser) await browser.close();
    server.kill();
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
