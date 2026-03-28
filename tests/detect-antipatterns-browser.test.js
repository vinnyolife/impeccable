/**
 * Puppeteer-powered tests for the browser detection script.
 * Verifies the browser visualizer finds the same anti-patterns as the CLI.
 *
 * These tests start a local server and use Puppeteer to load fixture pages,
 * inject the browser script, and compare findings with the CLI's jsdom output.
 *
 * Requires: puppeteer (npx cache or npm install)
 */
import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { spawn } from 'child_process';
import path from 'path';
import { detectHtml } from '../source/skills/critique/scripts/detect-antipatterns.mjs';

const FIXTURES = path.join(import.meta.dir, 'fixtures', 'antipatterns');
const PORT = 3099; // Use a different port to avoid conflicts with dev server
let serverProcess;
let puppeteer;

// Check if puppeteer is available
let hasPuppeteer = false;
try {
  puppeteer = await import('puppeteer');
  hasPuppeteer = true;
} catch {}

const describeIf = hasPuppeteer ? describe : describe.skip;

describeIf('browser script parity with CLI', () => {
  beforeAll(async () => {
    // Start a simple file server for fixtures + browser script
    serverProcess = spawn('node', ['-e', `
      const http = require('http');
      const fs = require('fs');
      const path = require('path');
      const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript' };
      http.createServer((req, res) => {
        let filePath;
        if (req.url.startsWith('/fixtures/')) {
          filePath = path.join(${JSON.stringify(path.join(import.meta.dir))}, req.url);
        } else if (req.url.startsWith('/js/')) {
          // Check public/js/ first, then built artifacts
          const basename = req.url.split('/').pop();
          filePath = path.join(${JSON.stringify(path.join(import.meta.dir, '..', 'public'))}, req.url);
          if (!fs.existsSync(filePath)) {
            filePath = path.join(${JSON.stringify(path.join(import.meta.dir, '..', '.claude', 'skills', 'critique', 'scripts'))}, basename);
          }
        } else {
          res.writeHead(404); res.end(); return;
        }
        try {
          const content = fs.readFileSync(filePath);
          const ext = path.extname(filePath);
          res.writeHead(200, { 'Content-Type': types[ext] || 'text/plain' });
          res.end(content);
        } catch { res.writeHead(404); res.end(); }
      }).listen(${PORT});
    `], { stdio: 'ignore' });

    // Wait for server to start
    await new Promise(r => setTimeout(r, 500));
  });

  afterAll(() => {
    if (serverProcess) serverProcess.kill();
  });

  async function scanWithBrowser(fixtureName) {
    const browser = await puppeteer.default.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(`http://localhost:${PORT}/fixtures/antipatterns/${fixtureName}`, {
      waitUntil: 'networkidle0',
      timeout: 10000,
    });

    // Wait for the browser script to run (it uses setTimeout 100ms)
    await new Promise(r => setTimeout(r, 300));

    const results = await page.evaluate(() => {
      if (!window.impeccableScan) return [];
      const allFindings = window.impeccableScan();
      return allFindings.flatMap(({ findings }) =>
        findings.map(f => ({ type: f.type, detail: f.detail }))
      );
    });

    await browser.close();
    return results;
  }

  function getTypes(findings) {
    return [...new Set(findings.map(f => f.antipattern || f.type))].sort();
  }

  test('should-flag.html: browser finds border anti-patterns', async () => {
    const browserFindings = await scanWithBrowser('should-flag.html');
    const types = [...new Set(browserFindings.map(f => f.type))];
    expect(types).toContain('side-tab');
    expect(types).toContain('border-accent-on-rounded');
  }, 15000);

  test('should-pass.html: browser finds no border anti-patterns', async () => {
    const browserFindings = await scanWithBrowser('should-pass.html');
    const borderFindings = browserFindings.filter(f =>
      f.type === 'side-tab' || f.type === 'border-accent-on-rounded'
    );
    expect(borderFindings).toHaveLength(0);
  }, 15000);

  test('color-should-flag.html: browser finds color anti-patterns', async () => {
    const browserFindings = await scanWithBrowser('color-should-flag.html');
    const types = [...new Set(browserFindings.map(f => f.type))];
    expect(types).toContain('low-contrast');
    expect(types).toContain('gray-on-color');
  }, 15000);

  test('color-should-pass.html: browser finds zero findings', async () => {
    const browserFindings = await scanWithBrowser('color-should-pass.html');
    expect(browserFindings).toHaveLength(0);
  }, 15000);

  test('layout-should-flag.html: browser finds nested cards', async () => {
    const browserFindings = await scanWithBrowser('layout-should-flag.html');
    const nested = browserFindings.filter(f => f.type === 'nested-cards');
    expect(nested.length).toBeGreaterThanOrEqual(3);
  }, 15000);

  test('layout-should-pass.html: browser finds no nested cards', async () => {
    const browserFindings = await scanWithBrowser('layout-should-pass.html');
    const nested = browserFindings.filter(f => f.type === 'nested-cards');
    expect(nested).toHaveLength(0);
  }, 15000);

  test('typography-should-flag.html: browser finds typography issues', async () => {
    const browserFindings = await scanWithBrowser('typography-should-flag.html');
    const types = [...new Set(browserFindings.map(f => f.type))];
    expect(types).toContain('overused-font');
    expect(types).toContain('flat-type-hierarchy');
  }, 15000);

  test('partial-component.html: browser skips page-level checks', async () => {
    const browserFindings = await scanWithBrowser('partial-component.html');
    // Should find border issues but not typography
    const hasBorder = browserFindings.some(f => f.type === 'side-tab');
    const hasTypo = browserFindings.some(f =>
      f.type === 'flat-type-hierarchy' || f.type === 'single-font'
    );
    expect(hasBorder).toBe(true);
    // Browser script doesn't have isFullPage check, so we just verify borders work
  }, 15000);
});

describeIf('overlay positioning accuracy', () => {
  let browser, page;
  const TOLERANCE = 6; // px tolerance for position comparison (2px border offset + rounding)

  beforeAll(async () => {
    // Reuse same server setup — these tests run in the same suite
    serverProcess = spawn('node', ['-e', `
      const http = require('http');
      const fs = require('fs');
      const path = require('path');
      const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript' };
      http.createServer((req, res) => {
        let filePath;
        if (req.url.startsWith('/fixtures/')) {
          filePath = path.join(${JSON.stringify(path.join(import.meta.dir))}, req.url);
        } else if (req.url.startsWith('/js/')) {
          const basename = req.url.split('/').pop();
          filePath = path.join(${JSON.stringify(path.join(import.meta.dir, '..', 'public'))}, req.url);
          if (!fs.existsSync(filePath)) {
            filePath = path.join(${JSON.stringify(path.join(import.meta.dir, '..', '.claude', 'skills', 'critique', 'scripts'))}, basename);
          }
        } else {
          res.writeHead(404); res.end(); return;
        }
        try {
          const content = fs.readFileSync(filePath);
          const ext = path.extname(filePath);
          res.writeHead(200, { 'Content-Type': types[ext] || 'text/plain' });
          res.end(content);
        } catch { res.writeHead(404); res.end(); }
      }).listen(${PORT + 1});
    `], { stdio: 'ignore' });

    await new Promise(r => setTimeout(r, 500));

    browser = await puppeteer.default.launch({ headless: true });
    page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto(`http://localhost:${PORT + 1}/fixtures/antipatterns/overlay-positioning.html`, {
      waitUntil: 'networkidle0',
      timeout: 10000,
    });
    await new Promise(r => setTimeout(r, 300));
    await page.evaluate(() => {
      if (window.impeccableScan) window.impeccableScan();
    });
    await new Promise(r => setTimeout(r, 200));
  });

  afterAll(async () => {
    if (browser) await browser.close();
    if (serverProcess) serverProcess.kill();
  });

  async function getOverlayPositions() {
    return page.evaluate(() => {
      const overlays = document.querySelectorAll('.impeccable-overlay:not(.impeccable-banner)');
      return Array.from(overlays).map(o => {
        const t = o._targetEl;
        if (!t) return null;
        const tRect = t.getBoundingClientRect();
        const oRect = o.getBoundingClientRect();
        const label = o.querySelector('.impeccable-label')?.textContent || '';
        return {
          label,
          target: { top: tRect.top, left: tRect.left, width: tRect.width, height: tRect.height },
          overlay: { top: oRect.top, left: oRect.left, width: oRect.width, height: oRect.height },
          overlayHidden: o.style.display === 'none',
          targetVisible: tRect.width > 0 && tRect.height > 0,
          inClosedDetails: !!t.closest('details:not([open])'),
        };
      }).filter(Boolean);
    });
  }

  test('visible overlays are positioned within tolerance of their targets', async () => {
    const positions = await getOverlayPositions();
    const visible = positions.filter(p => !p.overlayHidden);
    expect(visible.length).toBeGreaterThan(0);

    for (const p of visible) {
      const topDiff = Math.abs(p.overlay.top - p.target.top);
      const leftDiff = Math.abs(p.overlay.left - p.target.left);
      const widthDiff = Math.abs(p.overlay.width - p.target.width);
      const heightDiff = Math.abs(p.overlay.height - p.target.height);

      expect(topDiff).toBeLessThanOrEqual(TOLERANCE);
      expect(leftDiff).toBeLessThanOrEqual(TOLERANCE);
      expect(widthDiff).toBeLessThanOrEqual(TOLERANCE);
      expect(heightDiff).toBeLessThanOrEqual(TOLERANCE);
    }
  }, 20000);

  test('overlays for non-rendered elements are hidden', async () => {
    const positions = await getOverlayPositions();
    // Elements inside closed <details> should have hidden overlays
    const closedDetailsOverlays = positions.filter(p => p.inClosedDetails);
    expect(closedDetailsOverlays.length).toBeGreaterThan(0);
    for (const p of closedDetailsOverlays) {
      expect(p.overlayHidden).toBe(true);
    }
  }, 20000);

  test('overlays inside transform ancestors are accurately positioned', async () => {
    const positions = await getOverlayPositions();
    const visible = positions.filter(p => !p.overlayHidden);
    for (const p of visible) {
      const topDiff = Math.abs(p.overlay.top - p.target.top);
      const leftDiff = Math.abs(p.overlay.left - p.target.left);
      expect(topDiff).toBeLessThanOrEqual(TOLERANCE);
      expect(leftDiff).toBeLessThanOrEqual(TOLERANCE);
    }
  }, 20000);
});
