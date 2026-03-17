#!/usr/bin/env node

/**
 * Anti-Pattern Detector for Impeccable
 *
 * Scans files/directories for known UI anti-patterns (starting with "side-tab").
 * Used by the critique skill and as a future hook.
 *
 * Usage:
 *   node detect-antipatterns.mjs [file-or-dir...]   # scan files/dirs
 *   node detect-antipatterns.mjs                     # scan cwd
 *   node detect-antipatterns.mjs --json              # JSON output
 *   echo '{"tool_input":{"file_path":"f.html"}}' | node detect-antipatterns.mjs  # stdin
 *
 * Exit codes: 0 = clean, 2 = findings
 */

import fs from 'fs';
import path from 'path';

// ---------------------------------------------------------------------------
// Line-level context helpers
// ---------------------------------------------------------------------------

/** Check if Tailwind `rounded-*` appears on the same line */
const hasRounded = (line) => /\brounded(?:-\w+)?\b/.test(line);

/** Check if CSS `border-radius` appears on the same line (inline styles) */
const hasBorderRadius = (line) => /border-radius/i.test(line);

/** Check if line contains an HTML element that legitimately uses side borders */
const SAFE_ELEMENTS = /<(?:blockquote|nav[\s>]|pre[\s>]|code[\s>]|a\s|input[\s>]|span[\s>])/i;
const isSafeElement = (line) => SAFE_ELEMENTS.test(line);

/** Check if the border color in a CSS declaration looks neutral (gray/structural) */
function isNeutralBorderColor(matchStr) {
  const colorMatch = matchStr.match(/solid\s+(#[0-9a-f]{3,8}|rgba?\([^)]+\)|\w+)/i);
  if (!colorMatch) return false;
  const c = colorMatch[1].toLowerCase();
  if (['gray', 'grey', 'silver', 'white', 'black', 'transparent', 'currentcolor'].includes(c)) return true;
  const hex = c.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/);
  if (hex) {
    const [r, g, b] = [parseInt(hex[1], 16), parseInt(hex[2], 16), parseInt(hex[3], 16)];
    return (Math.max(r, g, b) - Math.min(r, g, b)) < 30;
  }
  const shex = c.match(/^#([0-9a-f])([0-9a-f])([0-9a-f])$/);
  if (shex) {
    const [r, g, b] = [parseInt(shex[1] + shex[1], 16), parseInt(shex[2] + shex[2], 16), parseInt(shex[3] + shex[3], 16)];
    return (Math.max(r, g, b) - Math.min(r, g, b)) < 30;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Anti-pattern definitions
// ---------------------------------------------------------------------------

const ANTIPATTERNS = [
  {
    id: 'side-tab',
    name: 'Side-tab accent border',
    description:
      'Thick colored border on one side of a card — the most recognizable tell of AI-generated UIs. Use a subtler accent or remove it entirely.',
    matchers: [
      // Tailwind: border-[lrse]-N — threshold depends on context
      //   With rounded: any N >= 1 (even thin borders look wrong on rounded cards)
      //   Without rounded: N >= 4 (thick enough to always be suspicious)
      {
        regex: /\bborder-[lrse]-(\d+)\b/g,
        test: (match, line) => {
          const n = parseInt(match[1], 10);
          if (hasRounded(line)) return n >= 1;
          return n >= 4;
        },
        format: (match) => match[0],
      },
      // CSS shorthand: border-left/right: Npx solid [color]
      {
        regex: /border-(?:left|right)\s*:\s*(\d+)px\s+solid[^;]*/gi,
        test: (match, line) => {
          if (isSafeElement(line)) return false;
          if (isNeutralBorderColor(match[0])) return false;
          const n = parseInt(match[1], 10);
          if (hasBorderRadius(line)) return n >= 1;
          return n >= 3;
        },
        format: (match) => match[0].replace(/\s*;?\s*$/, ''),
      },
      // CSS longhand: border-left/right-width: Npx
      {
        regex: /border-(?:left|right)-width\s*:\s*(\d+)px/gi,
        test: (match, line) => {
          if (isSafeElement(line)) return false;
          const n = parseInt(match[1], 10);
          return n >= 3;
        },
        format: (match) => match[0],
      },
      // CSS logical: border-inline-start/end: Npx solid
      {
        regex: /border-inline-(?:start|end)\s*:\s*(\d+)px\s+solid/gi,
        test: (match, line) => {
          if (isSafeElement(line)) return false;
          const n = parseInt(match[1], 10);
          return n >= 3;
        },
        format: (match) => match[0],
      },
      // CSS logical longhand: border-inline-start/end-width: Npx
      {
        regex: /border-inline-(?:start|end)-width\s*:\s*(\d+)px/gi,
        test: (match, line) => {
          if (isSafeElement(line)) return false;
          const n = parseInt(match[1], 10);
          return n >= 3;
        },
        format: (match) => match[0],
      },
      // JSX inline: borderLeft/borderRight with thickness
      {
        regex: /border(?:Left|Right)\s*[:=]\s*["'`](\d+)px\s+solid/g,
        test: (match) => parseInt(match[1], 10) >= 3,
        format: (match) => match[0],
      },
    ],
  },
  {
    id: 'border-accent-on-rounded',
    name: 'Border accent on rounded element',
    description:
      'Thick accent border on a rounded card — the border clashes with the rounded corners. Remove the border or the border-radius.',
    matchers: [
      // Tailwind: border-[tb]-N + rounded-* on same line
      {
        regex: /\bborder-[tb]-(\d+)\b/g,
        test: (match, line) => {
          const n = parseInt(match[1], 10);
          return hasRounded(line) && n >= 1;
        },
        format: (match) => match[0],
      },
      // CSS: border-top/bottom with border-radius on same line (inline styles)
      {
        regex: /border-(?:top|bottom)\s*:\s*(\d+)px\s+solid/gi,
        test: (match, line) => {
          const n = parseInt(match[1], 10);
          return n >= 3 && hasBorderRadius(line);
        },
        format: (match) => match[0],
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Detection engine
// ---------------------------------------------------------------------------

/**
 * Scan content for anti-patterns.
 * @param {string} content  File content
 * @param {string} filePath File path (for reporting)
 * @returns {Array<{antipattern: string, name: string, description: string, file: string, line: number, snippet: string}>}
 */
function detectAntiPatterns(content, filePath) {
  const findings = [];
  const lines = content.split('\n');

  for (const ap of ANTIPATTERNS) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      for (const matcher of ap.matchers) {
        // Reset regex state for each line
        matcher.regex.lastIndex = 0;
        let m;
        while ((m = matcher.regex.exec(line)) !== null) {
          if (matcher.test(m, line)) {
            findings.push({
              antipattern: ap.id,
              name: ap.name,
              description: ap.description,
              file: filePath,
              line: i + 1,
              snippet: matcher.format(m),
            });
          }
        }
      }
    }
  }

  return findings;
}

// ---------------------------------------------------------------------------
// File walker
// ---------------------------------------------------------------------------

const SKIP_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', '.next', '.nuxt', '.output',
  '.svelte-kit', '__pycache__', '.turbo', '.vercel',
]);

const SCANNABLE_EXTENSIONS = new Set([
  '.html', '.htm', '.css', '.scss', '.less',
  '.jsx', '.tsx', '.js', '.ts',
  '.vue', '.svelte', '.astro',
]);

function walkDir(dir) {
  const files = [];
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return files;
  }
  for (const entry of entries) {
    if (entry.name.startsWith('.') && SKIP_DIRS.has(entry.name)) continue;
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkDir(full));
    } else if (SCANNABLE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      files.push(full);
    }
  }
  return files;
}

// ---------------------------------------------------------------------------
// Output formatting
// ---------------------------------------------------------------------------

function formatFindings(findings, jsonMode) {
  if (jsonMode) {
    return JSON.stringify(findings, null, 2);
  }

  const grouped = {};
  for (const f of findings) {
    if (!grouped[f.file]) grouped[f.file] = [];
    grouped[f.file].push(f);
  }

  const lines = [];
  for (const [file, items] of Object.entries(grouped)) {
    lines.push(`\n${file}`);
    for (const item of items) {
      lines.push(`  line ${item.line}: [${item.antipattern}] ${item.snippet}`);
      lines.push(`    → ${item.description}`);
    }
  }

  const count = findings.length;
  lines.push(`\n${count} anti-pattern${count === 1 ? '' : 's'} found.`);
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Stdin handling (for future hook use)
// ---------------------------------------------------------------------------

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf-8');
}

async function handleStdin() {
  const input = await readStdin();
  let parsed;
  try {
    parsed = JSON.parse(input);
  } catch {
    // Not JSON — treat as raw content
    return detectAntiPatterns(input, '<stdin>');
  }

  // Hook format: { tool_input: { file_path: "..." } }
  const filePath = parsed?.tool_input?.file_path;
  if (filePath && fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf-8');
    return detectAntiPatterns(content, filePath);
  }

  // Fallback: scan the raw JSON as content
  return detectAntiPatterns(input, '<stdin>');
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function printUsage() {
  console.log(`Usage: node detect-antipatterns.mjs [options] [file-or-dir...]

Scan files for known UI anti-patterns.

Options:
  --json    Output results as JSON
  --help    Show this help message

Examples:
  node detect-antipatterns.mjs src/
  node detect-antipatterns.mjs index.html styles.css
  node detect-antipatterns.mjs --json .
  echo '{"tool_input":{"file_path":"f.html"}}' | node detect-antipatterns.mjs`);
}

async function main() {
  const args = process.argv.slice(2);
  const jsonMode = args.includes('--json');
  const helpMode = args.includes('--help');
  const targets = args.filter((a) => a !== '--json' && a !== '--help');

  if (helpMode) {
    printUsage();
    process.exit(0);
  }

  let allFindings = [];

  // Check if stdin is piped
  if (!process.stdin.isTTY && targets.length === 0) {
    allFindings = await handleStdin();
  } else {
    // Default to cwd if no targets
    const paths = targets.length > 0 ? targets : [process.cwd()];

    for (const target of paths) {
      const resolved = path.resolve(target);
      let stat;
      try {
        stat = fs.statSync(resolved);
      } catch {
        process.stderr.write(`Warning: cannot access ${target}\n`);
        continue;
      }

      if (stat.isDirectory()) {
        for (const file of walkDir(resolved)) {
          const content = fs.readFileSync(file, 'utf-8');
          allFindings.push(...detectAntiPatterns(content, file));
        }
      } else if (stat.isFile()) {
        const content = fs.readFileSync(resolved, 'utf-8');
        allFindings.push(...detectAntiPatterns(content, resolved));
      }
    }
  }

  if (allFindings.length > 0) {
    const output = formatFindings(allFindings, jsonMode);
    process.stderr.write(output + '\n');
    process.exit(2);
  }

  if (jsonMode) {
    process.stdout.write('[]\n');
  }
  process.exit(0);
}

// Run CLI when executed directly; export for testing when imported
const isMainModule = process.argv[1] && (
  process.argv[1].endsWith('detect-antipatterns.mjs') ||
  process.argv[1].endsWith('detect-antipatterns.mjs/')
);

if (isMainModule) {
  main();
}

export { ANTIPATTERNS, detectAntiPatterns, walkDir, formatFindings, SCANNABLE_EXTENSIONS, SKIP_DIRS };
