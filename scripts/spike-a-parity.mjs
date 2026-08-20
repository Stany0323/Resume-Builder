import { chromium } from "playwright";
import { spawn } from "node:child_process";
import process from "node:process";
import fixture1Page from "../fixtures/fixture-1page.v2.json" with { type: "json" };
import fixture3Page from "../fixtures/fixture-3page.v2.json" with { type: "json" };

const webUrl = "http://127.0.0.1:51730/?measure=1";
const renderUrl = "http://127.0.0.1:4300/render/measure";
const fixtures = [
  ["fixture-1page", fixture1Page],
  ["fixture-3page", fixture3Page],
];

const web = spawn("npm", ["run", "dev", "--workspace", "@resume-builder/web", "--", "--port", "51730", "--strictPort"], {
  stdio: "pipe",
  shell: false,
});
const render = spawn("npm", ["run", "dev:once", "--workspace", "@resume-builder/render-service"], {
  stdio: "pipe",
  shell: false,
});

try {
  await Promise.all([
    waitForUrl("http://127.0.0.1:51730/"),
    waitForUrl("http://127.0.0.1:4300/health"),
  ]);

  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(webUrl, { waitUntil: "networkidle" });
  await page.waitForFunction(() => Boolean(window.__resumeMeasure));

  const failures = [];
  const results = [];

  for (const [fixtureName, fixture] of fixtures) {
    const resume = withA4PageSize(fixture);
    const browserMeasure = await page.evaluate(async (document) => {
      return window.__resumeMeasure.measure(document);
    }, resume);
    const serviceMeasure = await fetchJson(renderUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ resume, measureUrl: webUrl }),
    });

    const row = {
      fixtureName,
      pageSize: "A4",
      browserBreaks: browserMeasure.breakBlockIds,
      serviceBreaks: serviceMeasure.breakBlockIds,
      browserPages: browserMeasure.pages,
      pageBox: browserMeasure.pageBox,
      totalBlockHeight: browserMeasure.totalBlockHeight,
      browserFontHash: browserMeasure.fontHash,
      serviceFontHash: serviceMeasure.fontHash,
    };
    results.push(row);

    if (JSON.stringify(row.browserBreaks) !== JSON.stringify(row.serviceBreaks)) {
      failures.push(`${fixtureName} A4: break mismatch`);
    }

    if (row.browserFontHash !== row.serviceFontHash) {
      failures.push(`${fixtureName} A4: font hash mismatch`);
    }
  }

  await browser.close();
  console.table(results.map((result) => ({
    fixture: result.fixtureName,
    size: result.pageSize,
    browser: result.browserBreaks.join(",") || "(none)",
    service: result.serviceBreaks.join(",") || "(none)",
    used: result.browserPages.map((page) => page.usedHeight.toFixed(2)).join(" / "),
    pageHeight: result.pageBox.height,
    total: result.totalBlockHeight.toFixed(2),
    font: result.browserFontHash,
  })));

  if (failures.length > 0) {
    throw new Error(failures.join("\n"));
  }
} finally {
  web.kill();
  render.kill();
}

function withA4PageSize(resume) {
  return {
    ...resume,
    design: {
      ...resume.design,
      pageSize: "A4",
    },
  };
}

async function waitForUrl(url) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < 30_000) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }

  throw new Error(`Timed out waiting for ${url}`);
}

async function fetchJson(url, init) {
  const response = await fetch(url, init);
  if (!response.ok) {
    throw new Error(`${url} returned ${response.status}: ${await response.text()}`);
  }

  return response.json();
}
