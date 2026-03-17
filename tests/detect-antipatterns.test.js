import { describe, test, expect } from 'bun:test';
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { detectAntiPatterns, ANTIPATTERNS, walkDir, SCANNABLE_EXTENSIONS } from '../source/skills/critique/scripts/detect-antipatterns.mjs';

const FIXTURES = path.join(import.meta.dir, 'fixtures', 'antipatterns');
const SCRIPT = path.join(import.meta.dir, '..', 'source', 'skills', 'critique', 'scripts', 'detect-antipatterns.mjs');

// ---------------------------------------------------------------------------
// Core detection: Tailwind side-tab
// ---------------------------------------------------------------------------

describe('detectAntiPatterns — Tailwind side-tab', () => {
  test('detects border-l-4 (always, thick enough)', () => {
    const findings = detectAntiPatterns('<div class="border-l-4 border-blue-500">', 'test.html');
    expect(findings).toHaveLength(1);
    expect(findings[0].antipattern).toBe('side-tab');
    expect(findings[0].snippet).toBe('border-l-4');
  });

  test('detects border-e-8 (always, thick enough)', () => {
    const findings = detectAntiPatterns('<div class="border-e-8 border-red-500">', 'test.html');
    expect(findings).toHaveLength(1);
    expect(findings[0].snippet).toBe('border-e-8');
  });

  test('ignores border-r-2 without rounded (below threshold)', () => {
    const findings = detectAntiPatterns('<div class="border-r-2 border-red-400">', 'test.html');
    expect(findings).toHaveLength(0);
  });

  test('detects border-r-2 WITH rounded (context-aware)', () => {
    const findings = detectAntiPatterns('<div class="border-r-2 border-red-400 rounded-lg">', 'test.html');
    expect(findings).toHaveLength(1);
    expect(findings[0].snippet).toBe('border-r-2');
  });

  test('detects border-l-1 with rounded (even thin borders)', () => {
    const findings = detectAntiPatterns('<div class="border-l-1 border-blue-500 rounded-md">', 'test.html');
    expect(findings).toHaveLength(1);
  });

  test('ignores border-l-1 without rounded', () => {
    const findings = detectAntiPatterns('<div class="border-l-1 border-gray-300">', 'test.html');
    expect(findings).toHaveLength(0);
  });

  test('ignores border-l-0', () => {
    const findings = detectAntiPatterns('<div class="border-l-0">', 'test.html');
    expect(findings).toHaveLength(0);
  });

  test('detects multiple on same line', () => {
    const findings = detectAntiPatterns('<div class="border-l-4 border-r-4">', 'test.html');
    expect(findings).toHaveLength(2);
  });

  test('does not flag border-t or border-b without rounded', () => {
    const findings = detectAntiPatterns('<div class="border-t-4 border-b-4">', 'test.html');
    expect(findings).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Context-aware detection: rounded corners
// ---------------------------------------------------------------------------

describe('detectAntiPatterns — rounded context', () => {
  test('border-s-2 + rounded-xl triggers', () => {
    const findings = detectAntiPatterns('<div class="border-s-2 border-amber-500 rounded-xl">', 'test.html');
    expect(findings).toHaveLength(1);
  });

  test('border-l-3 + rounded triggers', () => {
    const findings = detectAntiPatterns('<div class="border-l-3 rounded bg-white">', 'test.html');
    expect(findings).toHaveLength(1);
  });

  test('border-l-3 without rounded does not trigger', () => {
    const findings = detectAntiPatterns('<div class="border-l-3 bg-white">', 'test.html');
    expect(findings).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Safe element exclusions
// ---------------------------------------------------------------------------

describe('detectAntiPatterns — safe elements', () => {
  test('skips blockquote', () => {
    const findings = detectAntiPatterns('<blockquote style="border-left: 4px solid #ccc;">', 'test.html');
    expect(findings).toHaveLength(0);
  });

  test('skips nav link', () => {
    const findings = detectAntiPatterns('<a href="#" style="border-left: 3px solid blue;">', 'test.html');
    expect(findings).toHaveLength(0);
  });

  test('skips input', () => {
    const findings = detectAntiPatterns('<input style="border-left: 3px solid red; border-radius: 6px;">', 'test.html');
    expect(findings).toHaveLength(0);
  });

  test('skips code/pre', () => {
    const findings = detectAntiPatterns('<code style="border-left: 3px solid green;">', 'test.html');
    expect(findings).toHaveLength(0);
  });

  test('skips span (code diff lines)', () => {
    const findings = detectAntiPatterns('<span style="border-left: 3px solid #ef4444;">', 'test.html');
    expect(findings).toHaveLength(0);
  });

  test('does NOT skip div (still flags)', () => {
    const findings = detectAntiPatterns('<div style="border-left: 4px solid blue;">', 'test.html');
    expect(findings).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// Core detection: CSS shorthand
// ---------------------------------------------------------------------------

describe('detectAntiPatterns — CSS shorthand', () => {
  test('detects border-left: Npx solid', () => {
    const findings = detectAntiPatterns('.card { border-left: 4px solid #3b82f6; }', 'test.css');
    expect(findings).toHaveLength(1);
    expect(findings[0].snippet).toContain('border-left');
  });

  test('detects border-right: Npx solid', () => {
    const findings = detectAntiPatterns('.card { border-right: 5px solid purple; }', 'test.css');
    expect(findings).toHaveLength(1);
  });

  test('ignores border-left: 2px solid (below threshold)', () => {
    const findings = detectAntiPatterns('.card { border-left: 2px solid blue; }', 'test.css');
    expect(findings).toHaveLength(0);
  });

  test('ignores border-top: 4px solid', () => {
    const findings = detectAntiPatterns('.card { border-top: 4px solid blue; }', 'test.css');
    expect(findings).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Core detection: CSS longhand
// ---------------------------------------------------------------------------

describe('detectAntiPatterns — CSS longhand', () => {
  test('detects border-left-width: Npx', () => {
    const findings = detectAntiPatterns('.card { border-left-width: 3px; }', 'test.css');
    expect(findings).toHaveLength(1);
  });

  test('detects border-right-width: Npx', () => {
    const findings = detectAntiPatterns('.card { border-right-width: 6px; }', 'test.css');
    expect(findings).toHaveLength(1);
  });

  test('ignores border-left-width: 2px', () => {
    const findings = detectAntiPatterns('.card { border-left-width: 2px; }', 'test.css');
    expect(findings).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Core detection: CSS logical properties
// ---------------------------------------------------------------------------

describe('detectAntiPatterns — CSS logical properties', () => {
  test('detects border-inline-start: Npx solid', () => {
    const findings = detectAntiPatterns('.card { border-inline-start: 4px solid gold; }', 'test.css');
    expect(findings).toHaveLength(1);
  });

  test('detects border-inline-end: Npx solid', () => {
    const findings = detectAntiPatterns('.card { border-inline-end: 3px solid pink; }', 'test.css');
    expect(findings).toHaveLength(1);
  });

  test('detects border-inline-start-width: Npx', () => {
    const findings = detectAntiPatterns('.card { border-inline-start-width: 5px; }', 'test.css');
    expect(findings).toHaveLength(1);
  });

  test('detects border-inline-end-width: Npx', () => {
    const findings = detectAntiPatterns('.card { border-inline-end-width: 4px; }', 'test.css');
    expect(findings).toHaveLength(1);
  });

  test('ignores border-inline-start: 2px solid', () => {
    const findings = detectAntiPatterns('.card { border-inline-start: 2px solid blue; }', 'test.css');
    expect(findings).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Core detection: JSX inline styles
// ---------------------------------------------------------------------------

describe('detectAntiPatterns — JSX inline styles', () => {
  test('detects borderLeft with px value', () => {
    const findings = detectAntiPatterns('borderLeft: "4px solid #3b82f6"', 'test.jsx');
    expect(findings).toHaveLength(1);
  });

  test('detects borderRight with px value', () => {
    const findings = detectAntiPatterns("borderRight: '5px solid purple'", 'test.tsx');
    expect(findings).toHaveLength(1);
  });

  test('ignores borderLeft: 2px (below threshold)', () => {
    const findings = detectAntiPatterns('borderLeft: "2px solid blue"', 'test.jsx');
    expect(findings).toHaveLength(0);
  });

  test('ignores borderTop', () => {
    const findings = detectAntiPatterns('borderTop: "4px solid blue"', 'test.jsx');
    expect(findings).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Top/bottom + rounded detection
// ---------------------------------------------------------------------------

describe('detectAntiPatterns — border accent on rounded', () => {
  test('border-t-4 + rounded-lg triggers', () => {
    const findings = detectAntiPatterns('<div class="border-t-4 border-blue-500 rounded-lg">', 'test.html');
    expect(findings).toHaveLength(1);
    expect(findings[0].antipattern).toBe('border-accent-on-rounded');
  });

  test('border-b-2 + rounded-xl triggers', () => {
    const findings = detectAntiPatterns('<div class="border-b-2 border-purple-500 rounded-xl">', 'test.html');
    expect(findings).toHaveLength(1);
  });

  test('border-t-1 + rounded triggers (even thin)', () => {
    const findings = detectAntiPatterns('<div class="border-t-1 border-emerald-500 rounded-md">', 'test.html');
    expect(findings).toHaveLength(1);
  });

  test('border-t-4 WITHOUT rounded does not trigger', () => {
    const findings = detectAntiPatterns('<div class="border-t-4 border-blue-500">', 'test.html');
    expect(findings).toHaveLength(0);
  });

  test('border-b-4 WITHOUT rounded does not trigger', () => {
    const findings = detectAntiPatterns('<div class="border-b-4 border-purple-500">', 'test.html');
    expect(findings).toHaveLength(0);
  });

  test('CSS border-top + border-radius on same line triggers', () => {
    const findings = detectAntiPatterns('<div style="border-top: 4px solid blue; border-radius: 12px;">', 'test.html');
    expect(findings).toHaveLength(1);
    expect(findings[0].antipattern).toBe('border-accent-on-rounded');
  });

  test('CSS border-bottom + border-radius on same line triggers', () => {
    const findings = detectAntiPatterns('<div style="border-bottom: 3px solid purple; border-radius: 8px;">', 'test.html');
    expect(findings).toHaveLength(1);
  });

  test('CSS border-top WITHOUT border-radius does not trigger', () => {
    const findings = detectAntiPatterns('.section { border-top: 4px solid blue; }', 'test.css');
    expect(findings).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Fixture files
// ---------------------------------------------------------------------------

describe('fixture file scanning', () => {
  test('should-flag.html detects side-tabs and accent borders', () => {
    const content = fs.readFileSync(path.join(FIXTURES, 'should-flag.html'), 'utf-8');
    const findings = detectAntiPatterns(content, 'should-flag.html');
    // Tailwind (5) + CSS (7) + top/bottom Tailwind (3) + top/bottom CSS (2)
    expect(findings.length).toBeGreaterThanOrEqual(13);
    expect(findings.some(f => f.antipattern === 'side-tab')).toBe(true);
    expect(findings.some(f => f.antipattern === 'border-accent-on-rounded')).toBe(true);
  });

  test('should-pass.html has zero findings', () => {
    const content = fs.readFileSync(path.join(FIXTURES, 'should-pass.html'), 'utf-8');
    const findings = detectAntiPatterns(content, 'should-pass.html');
    expect(findings).toHaveLength(0);
  });

  test('legitimate-borders.html has minimal false positives', () => {
    const content = fs.readFileSync(path.join(FIXTURES, 'legitimate-borders.html'), 'utf-8');
    const findings = detectAntiPatterns(content, 'legitimate-borders.html');
    // Alert banner (colored left border on div) is an acceptable true positive
    // Blockquotes, nav, inputs, code spans, timeline (gray) should be skipped
    expect(findings.length).toBeLessThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// Finding structure
// ---------------------------------------------------------------------------

describe('finding structure', () => {
  test('finding has all required fields', () => {
    const findings = detectAntiPatterns('<div class="border-l-4 border-blue-500">', 'app.html');
    expect(findings).toHaveLength(1);
    const f = findings[0];
    expect(f.antipattern).toBe('side-tab');
    expect(f.name).toBe('Side-tab accent border');
    expect(f.description).toBeTypeOf('string');
    expect(f.file).toBe('app.html');
    expect(f.line).toBe(1);
    expect(f.snippet).toBe('border-l-4');
  });

  test('reports correct line numbers', () => {
    const content = 'line 1\nline 2\n<div class="border-l-4">\nline 4';
    const findings = detectAntiPatterns(content, 'test.html');
    expect(findings).toHaveLength(1);
    expect(findings[0].line).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// ANTIPATTERNS registry
// ---------------------------------------------------------------------------

describe('ANTIPATTERNS registry', () => {
  test('has at least two entries', () => {
    expect(ANTIPATTERNS.length).toBeGreaterThanOrEqual(2);
  });

  test('each entry has required fields', () => {
    for (const ap of ANTIPATTERNS) {
      expect(ap.id).toBeTypeOf('string');
      expect(ap.name).toBeTypeOf('string');
      expect(ap.description).toBeTypeOf('string');
      expect(ap.matchers).toBeArray();
      expect(ap.matchers.length).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// walkDir
// ---------------------------------------------------------------------------

describe('walkDir', () => {
  test('finds scannable files', () => {
    const files = walkDir(FIXTURES);
    expect(files.length).toBeGreaterThanOrEqual(3);
    expect(files.every(f => SCANNABLE_EXTENSIONS.has(path.extname(f)))).toBe(true);
  });

  test('returns empty array for nonexistent dir', () => {
    const files = walkDir('/nonexistent/path/12345');
    expect(files).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// CLI integration
// ---------------------------------------------------------------------------

describe('CLI', () => {
  function run(...args) {
    const result = spawnSync('node', [SCRIPT, ...args], {
      encoding: 'utf-8',
      timeout: 10000,
    });
    return { stdout: result.stdout || '', stderr: result.stderr || '', code: result.status };
  }

  test('--help exits 0 and shows usage', () => {
    const { stdout, code } = run('--help');
    expect(code).toBe(0);
    expect(stdout).toContain('Usage:');
  });

  test('clean file exits 0', () => {
    const { code } = run(path.join(FIXTURES, 'should-pass.html'));
    expect(code).toBe(0);
  });

  test('file with anti-patterns exits 2', () => {
    const { code, stderr } = run(path.join(FIXTURES, 'should-flag.html'));
    expect(code).toBe(2);
    expect(stderr).toContain('side-tab');
  });

  test('--json outputs valid JSON array', () => {
    const { stderr, code } = run('--json', path.join(FIXTURES, 'should-flag.html'));
    expect(code).toBe(2);
    const parsed = JSON.parse(stderr.trim());
    expect(parsed).toBeArray();
    expect(parsed.length).toBeGreaterThan(0);
    expect(parsed[0].antipattern).toBe('side-tab');
  });

  test('--json on clean file outputs empty array on stdout', () => {
    const { stdout, code } = run('--json', path.join(FIXTURES, 'should-pass.html'));
    expect(code).toBe(0);
    expect(JSON.parse(stdout.trim())).toEqual([]);
  });

  test('scans directory recursively', () => {
    const { code, stderr } = run(FIXTURES);
    expect(code).toBe(2);
    expect(stderr).toContain('anti-pattern');
  });

  test('warns on nonexistent path', () => {
    const { stderr } = run('/nonexistent/file/xyz.html');
    expect(stderr).toContain('Warning');
  });
});
