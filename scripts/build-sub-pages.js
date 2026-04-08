/**
 * Generate static HTML files for /skills, /anti-patterns, /tutorials.
 *
 * Called from both scripts/build.js (before buildStaticSite) and
 * server/index.js (at module load), so dev and prod share the same
 * code path and output shape.
 *
 * Output lives under public/skills/, public/anti-patterns/,
 * public/tutorials/, all gitignored. Bun's HTML loader picks them up
 * the same way it picks up the hand-authored pages.
 */

import fs from 'node:fs';
import path from 'node:path';
import {
  buildSubPageData,
  CATEGORY_ORDER,
  CATEGORY_LABELS,
  CATEGORY_DESCRIPTIONS,
} from './lib/sub-pages-data.js';
import { renderMarkdown, slugify } from './lib/render-markdown.js';
import { renderPage } from './lib/render-page.js';

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Render one skill detail page HTML body (without the site shell).
 */
function renderSkillDetail(skill, knownSkillIds) {
  const bodyHtml = renderMarkdown(skill.body, {
    knownSkillIds,
    currentSkillId: skill.id,
  });

  const editorialHtml = skill.editorial
    ? renderMarkdown(skill.editorial.body, { knownSkillIds, currentSkillId: skill.id })
    : '';

  const tagline = skill.editorial?.frontmatter?.tagline || skill.description;
  const categoryLabel = CATEGORY_LABELS[skill.category] || skill.category;

  // Reference files as collapsible <details> blocks
  let referencesHtml = '';
  if (skill.references && skill.references.length > 0) {
    const refs = skill.references
      .map((ref) => {
        const slug = slugify(ref.name);
        const refBody = renderMarkdown(ref.content, {
          knownSkillIds,
          currentSkillId: skill.id,
        });
        const title = ref.name
          .split('-')
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ');
        return `
<details class="skill-reference" id="reference-${slug}">
  <summary><span class="skill-reference-label">Reference</span><span class="skill-reference-title">${escapeHtml(title)}</span></summary>
  <div class="prose skill-reference-body">
${refBody}
  </div>
</details>`;
      })
      .join('\n');
    referencesHtml = `
<section class="skill-references" aria-label="Reference material">
  <h2 class="skill-references-heading">Deeper reference</h2>
  ${refs}
</section>`;
  }

  const metaStrip = `
<div class="skill-meta-strip">
  <span class="skill-meta-chip skill-meta-category" data-category="${skill.category}">${escapeHtml(categoryLabel)}</span>
  <span class="skill-meta-chip">User-invocable</span>
  ${skill.argumentHint ? `<span class="skill-meta-chip skill-meta-args">${escapeHtml(skill.argumentHint)}</span>` : ''}
</div>`;

  return `
<article class="skill-detail">
  <header class="skill-detail-header">
    <p class="skill-detail-eyebrow"><a href="/skills">Skills</a> / ${escapeHtml(categoryLabel)}</p>
    <h1 class="skill-detail-title">/${escapeHtml(skill.id)}</h1>
    <p class="skill-detail-tagline">${escapeHtml(tagline)}</p>
    ${metaStrip}
  </header>

  ${editorialHtml ? `<section class="skill-detail-editorial prose">\n${editorialHtml}\n</section>` : ''}

  <div class="skill-detail-divider">
    <span>The skill itself</span>
  </div>

  <section class="skill-detail-body prose">
${bodyHtml}
  </section>

  ${referencesHtml}
</article>
`;
}

/**
 * Render the left sidebar used across the /skills section.
 * Shows every skill grouped by category. Pass the current skill id to
 * mark it with aria-current="page".
 */
function renderSkillsSidebar(skillsByCategory, currentSkillId = null) {
  let html = `
<aside class="skills-sidebar" aria-label="All skills">
  <div class="skills-sidebar-inner">
    <p class="skills-sidebar-label">Skills</p>
`;

  for (const category of CATEGORY_ORDER) {
    const list = skillsByCategory[category] || [];
    if (list.length === 0) continue;
    html += `
    <div class="skills-sidebar-group" data-category="${category}">
      <p class="skills-sidebar-group-title">${escapeHtml(CATEGORY_LABELS[category])}</p>
      <ul class="skills-sidebar-list">
${list
  .map((s) => {
    const current = s.id === currentSkillId ? ' aria-current="page"' : '';
    return `        <li><a href="/skills/${s.id}"${current}>/${escapeHtml(s.id)}</a></li>`;
  })
  .join('\n')}
      </ul>
    </div>
`;
  }

  html += `
  </div>
</aside>`;
  return html;
}

/**
 * Render the /skills overview main column content (not the sidebar).
 * This is the orientation piece — what are skills, how to pick one,
 * the six categories explained with inline cross-links to the detail pages.
 */
function renderSkillsOverviewMain(skillsByCategory) {
  const totalSkills = Object.values(skillsByCategory).reduce(
    (sum, list) => sum + list.length,
    0,
  );

  let categoriesHtml = '';
  for (const category of CATEGORY_ORDER) {
    const list = skillsByCategory[category] || [];
    if (list.length === 0) continue;

    const skillChips = list
      .map(
        (s) =>
          `<a class="skills-overview-chip" href="/skills/${s.id}">/${escapeHtml(s.id)}</a>`,
      )
      .join('');

    categoriesHtml += `
    <section class="skills-overview-category" data-category="${category}" id="category-${category}">
      <div class="skills-overview-category-meta">
        <h2 class="skills-overview-category-title">${escapeHtml(CATEGORY_LABELS[category])}</h2>
        <p class="skills-overview-category-count">${list.length} ${list.length === 1 ? 'skill' : 'skills'}</p>
      </div>
      <p class="skills-overview-category-desc">${escapeHtml(CATEGORY_DESCRIPTIONS[category])}</p>
      <div class="skills-overview-chips">
${skillChips}
      </div>
    </section>
`;
  }

  return `
<div class="skills-overview-content">
  <header class="skills-overview-header">
    <p class="sub-page-eyebrow">${totalSkills} commands</p>
    <h1 class="sub-page-title">Skills</h1>
    <p class="sub-page-lede">One skill (<a href="/skills/impeccable">/impeccable</a>) teaches your AI design. Twenty more commands steer the result. Each one is a small, opinionated tool that knows how to fix one specific thing &mdash; pick the one that matches the moment.</p>
  </header>

  <section class="skills-overview-howto">
    <h2 class="skills-overview-howto-title">How to pick one</h2>
    <p>Every skill is named after the intent you bring to it. If you&rsquo;re reviewing something, reach for <a href="/skills/critique">/critique</a> or <a href="/skills/audit">/audit</a>. If you&rsquo;re improving type, reach for <a href="/skills/typeset">/typeset</a>. If you want a last-mile pass before shipping, reach for <a href="/skills/polish">/polish</a>. The categories below group them by the job you&rsquo;re doing.</p>
  </section>

  <div class="skills-overview-categories">
${categoriesHtml}
  </div>
</div>`;
}

/**
 * Wrap sidebar + main content in the docs-browser layout shell.
 */
function wrapInDocsLayout(sidebarHtml, mainHtml) {
  return `
<div class="skills-layout">
  ${sidebarHtml}
  <div class="skills-main">
${mainHtml}
  </div>
</div>`;
}

/**
 * Entry point. Generates all sub-page HTML files.
 *
 * @param {string} rootDir
 * @returns {Promise<{ files: string[] }>} list of generated file paths (absolute)
 */
export async function generateSubPages(rootDir) {
  const data = buildSubPageData(rootDir);
  const outDirs = {
    skills: path.join(rootDir, 'public/skills'),
    antiPatterns: path.join(rootDir, 'public/anti-patterns'),
    tutorials: path.join(rootDir, 'public/tutorials'),
  };

  // Fresh output dirs each time so stale files don't linger.
  for (const dir of Object.values(outDirs)) {
    if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(dir, { recursive: true });
  }

  const generated = [];

  // Skills index — docs-browser layout with sticky sidebar.
  {
    const sidebar = renderSkillsSidebar(data.skillsByCategory, null);
    const main = renderSkillsOverviewMain(data.skillsByCategory);
    const html = renderPage({
      title: 'Skills — Impeccable',
      description:
        '21 commands that teach your AI harness how to design. Browse by category: create, evaluate, refine, simplify, harden, system.',
      bodyHtml: wrapInDocsLayout(sidebar, main),
      activeNav: 'skills',
      canonicalPath: '/skills',
      bodyClass: 'sub-page skills-layout-page',
    });
    const out = path.join(outDirs.skills, 'index.html');
    fs.writeFileSync(out, html, 'utf-8');
    generated.push(out);
  }

  // Skills detail pages
  for (const skill of data.skills) {
    const bodyHtml = renderSkillDetail(skill, data.knownSkillIds);
    const title = `/${skill.id} — Impeccable skill`;
    const description = skill.editorial?.frontmatter?.tagline || skill.description;
    const html = renderPage({
      title,
      description,
      bodyHtml,
      activeNav: 'skills',
      canonicalPath: `/skills/${skill.id}`,
    });
    const out = path.join(outDirs.skills, `${skill.id}.html`);
    fs.writeFileSync(out, html, 'utf-8');
    generated.push(out);
  }

  return { files: generated };
}
