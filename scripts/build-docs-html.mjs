#!/usr/bin/env node
/**
 * Build static HTML for every markdown file under `docs/`.
 * Output: `docs/html/<section>/<slug>.html` + `docs/html/index.html`
 * Stylesheet: `docs/html/docs.css` (committed, not generated).
 * Run: `bun run docs:html`
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { marked } from 'marked';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const DOCS = path.join(ROOT, 'docs');
const OUT = path.join(DOCS, 'html');

const SECTIONS = [
  { dir: 'architecture', title: 'Architecture', blurb: 'System reference — data model, data flow, sync.' },
  { dir: 'design',       title: 'Design',       blurb: 'Design system — tokens, typography, components.' },
  { dir: 'guides',       title: 'Guides',       blurb: 'Operational how-tos — setup, deployment, contributing.' },
  { dir: 'audits',       title: 'Audits',       blurb: 'Historical audit reports + known issues.' },
  { dir: 'plans',        title: 'Plans',        blurb: 'RFCs and implementation roadmaps.' },
];

const STANDALONE = [
  { src: 'README.md',                slug: 'index',      title: 'Docs index' },
  { src: 'CHANGELOG.md',             slug: 'changelog',  title: 'Changelog' },
  { src: 'PORTFOLIO-SUMMARY.md',     slug: 'portfolio',  title: 'Portfolio summary' },
  { src: 'LLM_COUNCIL_FRAMEWORK.md', slug: 'llm-council', title: 'LLM Council framework' },
];

// ── HTML helpers ─────────────────────────────────────────────────────────
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&', '<': '<', '>': '>', '"': '"', "'": '&#39;',
  }[c]));
}

function slugify(text) {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

// ── Marked renderer ─────────────────────────────────────────────────────
function buildRenderer() {
  const renderer = new marked.Renderer();
  let h2Counter = 0;

  renderer.heading = ({ tokens, depth }) => {
    const text = marked.Parser.parseInline(tokens);
    const plain = tokens.map((t) => t.text || '').join('');
    const id = slugify(plain);
    if (depth === 1) return '';
    if (depth === 2) {
      h2Counter += 1;
      const num = String(h2Counter).padStart(2, '0');
      return `<section class="he-section" id="${id}">
  <div class="he-section__num">${num} · ${escapeHtml(plain)}</div>
  <h2 class="he-section__title">${text}</h2>`;
    }
    return `<h${depth} id="${id}">${text}</h${depth}>`;
  };

  renderer.link = ({ href, title, tokens }) => {
    const text = marked.Parser.parseInline(tokens);
    let finalHref = href || '';
    if (/\.md(#|$)/i.test(finalHref) && !/^https?:/i.test(finalHref)) {
      finalHref = finalHref.replace(/\.md(?=#|$)/i, '.html');
    }
    const titleAttr = title ? ` title="${escapeHtml(title)}"` : '';
    const external = /^https?:/i.test(finalHref) ? ' target="_blank" rel="noopener noreferrer"' : '';
    return `<a href="${escapeHtml(finalHref)}"${titleAttr}${external}>${text}</a>`;
  };

  renderer.codespan = ({ text }) => `<code>${escapeHtml(text)}</code>`;
  renderer.code = ({ text, lang }) => {
    const cls = lang ? ` class="language-${escapeHtml(lang)}"` : '';
    return `<pre><code${cls}>${escapeHtml(text)}</code></pre>`;
  };

  return { renderer, resetCounter: () => { h2Counter = 0; } };
}

// ── TOC + header parsing ───────────────────────────────────────────────
function extractToc(md) {
  const out = [];
  for (const line of md.split('\n')) {
    const m = line.match(/^(##|###)\s+(.+?)\s*$/);
    if (m) {
      const depth = m[1].length;
      const text = m[2].replace(/^[#`*\s]+|[`*\s]+$/g, '');
      out.push({ depth, text, id: slugify(text) });
    }
  }
  return out;
}

function parseHeader(md) {
  const h1Match = md.match(/^#\s+(.+)$/m);
  const title = h1Match ? h1Match[1].trim() : 'Untitled';
  const afterH1 = h1Match ? md.slice((h1Match.index ?? 0) + h1Match[0].length) : md;
  const paragraphs = afterH1.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const deckCandidate = paragraphs.find(
    (p) => !p.startsWith('#') && !p.startsWith('```') && !p.startsWith('|') && !p.startsWith('- ') && !p.startsWith('* ') && !p.startsWith('> '),
  );
  let deckMarkdown = '';
  if (deckCandidate) {
    const oneLine = deckCandidate.replace(/\s+/g, ' ');
    const sentenceEnd = oneLine.match(/^([^.!?`]+(?:`[^`]*`[^.!?`]*)*[.!?])(?=\s|$)/);
    if (sentenceEnd) {
      deckMarkdown = sentenceEnd[1];
    } else {
      let slice = oneLine.slice(0, 240);
      const lastOpenBracket = slice.lastIndexOf('[');
      const lastCloseParen = slice.lastIndexOf(')');
      if (lastOpenBracket > lastCloseParen) slice = slice.slice(0, lastOpenBracket).trimEnd();
      const lastTick = slice.lastIndexOf('`');
      if (lastTick > -1 && (slice.match(/`/g) || []).length % 2 === 1) slice = slice.slice(0, lastTick).trimEnd();
      const lastSpace = slice.lastIndexOf(' ');
      if (lastSpace > 200) slice = slice.slice(0, lastSpace);
      deckMarkdown = slice.replace(/[,:;\s]+$/, '') + '…';
    }
  }
  return { title, deckMarkdown };
}

function stripHeader(md) {
  let out = md.replace(/^#\s+[^\n]+\n+/, '');
  const m = out.match(/^([^\n]+(?:\n[^\n]+)*)\n\s*\n/);
  if (m) {
    const first = m[1].trimStart();
    if (
      !first.startsWith('#') && !first.startsWith('```') && !first.startsWith('|') &&
      !first.startsWith('- ') && !first.startsWith('* ') && !first.startsWith('> ')
    ) {
      out = out.slice(m[0].length);
    }
  }
  return out;
}

// ── Page template ───────────────────────────────────────────────────────
function pageHtml({ title, eyebrow, deckHtml, body, toc, project, basePathToHtml, isIndex }) {
  const nav = `
<nav class="he-nav">
  <a class="he-nav__brand" href="${basePathToHtml}index.html">${escapeHtml(project)} <small>docs</small></a>
  <div class="he-nav__links">
    <a href="${basePathToHtml}index.html">Index</a>
    <a href="${basePathToHtml}architecture/system-overview.html">Architecture</a>
    <a href="${basePathToHtml}design/01-foundations.html">Design</a>
    <a href="${basePathToHtml}guides/setup.html">Guides</a>
    <a href="${basePathToHtml}audits/known-issues.html">Audits</a>
    <a href="${basePathToHtml}plans/future-plans.html">Plans</a>
  </div>
</nav>`;

  const tocHtml = toc && toc.length >= 3 ? `
<aside class="he-toc" aria-label="On this page">
  <p class="he-toc__label">On this page</p>
  <ul>
    ${toc.map((t) => `<li class="he-toc__l${t.depth}"><a href="#${t.id}">${escapeHtml(t.text)}</a></li>`).join('\n    ')}
  </ul>
</aside>` : '';

  const useTwoCol = !!tocHtml && !isIndex;
  const layoutOpen = useTwoCol ? '<div class="he-layout">' : '';
  const layoutClose = useTwoCol ? '</div>' : '';
  const mainOpen = useTwoCol ? '<main class="he-main">' : '<main>';
  const shellWide = useTwoCol ? ' he-shell--wide' : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${escapeHtml(title)} · ${escapeHtml(project)}</title>
<link rel="stylesheet" href="${basePathToHtml}docs.css">
</head>
<body>
<div class="he-shell${shellWide}">
${nav}
${layoutOpen}
${mainOpen}
<header>
  <p class="he-eyebrow">${escapeHtml(eyebrow)}</p>
  <h1 class="he-title">${escapeHtml(title)}</h1>
  ${deckHtml ? `<p class="he-deck">${deckHtml}</p>` : ''}
</header>
${body}
</main>
${tocHtml}
${layoutClose}
<footer class="he-foot">
  Source · <a href="${basePathToHtml}../">browse the markdown</a> · rebuild with <code>bun run docs:html</code>
</footer>
</div>
</body>
</html>
`;
}

// ── File walking ────────────────────────────────────────────────────────
async function walkMd(dir) {
  const out = [];
  const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
  for (const ent of entries) {
    if (!ent.isDirectory() && ent.name.endsWith('.md')) out.push(path.join(dir, ent.name));
  }
  return out.sort();
}

// ── Build one MD file ───────────────────────────────────────────────────
async function buildPage({ src, outPath, section, project, basePathToHtml, overrideTitle }) {
  const md = await fs.readFile(src, 'utf8');
  const { title: parsedTitle, deckMarkdown } = parseHeader(md);
  const title = overrideTitle || parsedTitle;
  const toc = extractToc(md);
  const stripped = stripHeader(md);
  const { renderer, resetCounter } = buildRenderer();
  resetCounter();
  const body = marked.parse(stripped, { gfm: true, renderer });
  const deckHtml = deckMarkdown ? marked.parseInline(deckMarkdown, { gfm: true }) : '';
  const html = pageHtml({
    title, eyebrow: section.title, deckHtml, body, toc, project, basePathToHtml, isIndex: false,
  });
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, html, 'utf8');
  return {
    slug: path.basename(outPath, '.html'),
    title,
    deck: deckMarkdown,
    srcRelative: path.relative(ROOT, src).replaceAll('\\', '/'),
  };
}

// ── Build the index ─────────────────────────────────────────────────────
async function buildIndex({ project, sectionResults, standaloneResults }) {
  const sectionsHtml = sectionResults.map((s) => {
    const cards = s.files.map((f) => `
    <a class="he-card" href="./${s.dir}/${f.slug}.html">
      <div class="he-card__eyebrow">${escapeHtml(s.title)}</div>
      <h3>${escapeHtml(f.title)}</h3>
      <p>${escapeHtml((f.deck || '').slice(0, 180))}</p>
      <div class="he-card__meta">${escapeHtml(f.srcRelative)}</div>
    </a>`).join('');

    return `
<section class="he-index-section" id="${s.dir}">
  <div class="he-index-section__head">
    <h2>${escapeHtml(s.title)}</h2>
    <p class="he-index-section__blurb">${escapeHtml(s.blurb)}</p>
  </div>
  <div class="he-grid">${cards}
  </div>
</section>`;
  }).join('\n');

  const standaloneCards = standaloneResults.map((f) => `
    <div class="he-standalone-card">
      <a href="./${f.slug}.html">${escapeHtml(f.title)}</a>
      <p>${escapeHtml((f.deck || f.title).slice(0, 120))}</p>
    </div>`).join('');

  const standaloneSection = standaloneCards ? `
<section class="he-index-section" id="standalone">
  <div class="he-index-section__head">
    <h2>Top-level</h2>
    <p class="he-index-section__blurb">README, changelog, portfolio summary, and other standalone docs.</p>
  </div>
  <div class="he-standalone-grid">${standaloneCards}
  </div>
</section>` : '';

  const total = sectionResults.reduce((s, sec) => s + sec.files.length, 0) + standaloneResults.length;

  const body = `
<div class="he-kpis">
  <div class="he-kpi"><div class="he-kpi__value">${total}</div><div class="he-kpi__label">Generated pages</div></div>
  <div class="he-kpi"><div class="he-kpi__value">${sectionResults.length}</div><div class="he-kpi__label">Sections</div></div>
  <div class="he-kpi"><div class="he-kpi__value">${standaloneResults.length}</div><div class="he-kpi__label">Top-level</div></div>
</div>
${sectionsHtml}
${standaloneSection}
`;

  const html = pageHtml({
    title: 'Documentation',
    eyebrow: `${project} · docs`,
    deckHtml: 'All project documentation, organised by purpose. Markdown sources live under <code>docs/</code>.',
    body,
    toc: [],
    project,
    basePathToHtml: './',
    isIndex: true,
  });
  await fs.writeFile(path.join(OUT, 'index.html'), html, 'utf8');
}

// ── Main ───────────────────────────────────────────────────────────────
async function readProjectName() {
  try {
    const pkg = JSON.parse(await fs.readFile(path.join(ROOT, 'package.json'), 'utf8'));
    if (pkg.name) {
      return pkg.name.split(/[-_\s]+/).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    }
  } catch {}
  return 'Project';
}

async function main() {
  const project = await readProjectName();
  await fs.mkdir(OUT, { recursive: true });

  // Make sure the stylesheet is in place (it's also committed).
  const cssPath = path.join(OUT, 'docs.css');
  if (!(await fs.stat(cssPath).catch(() => null))) {
    console.error('[build-docs-html] missing docs/html/docs.css — restore it from git or recreate.');
    process.exit(1);
  }

  const sectionResults = [];
  for (const section of SECTIONS) {
    const srcDir = path.join(DOCS, section.dir);
    const outDir = path.join(OUT, section.dir);
    const files = await walkMd(srcDir);
    const built = [];
    for (const src of files) {
      const slug = path.basename(src, '.md');
      const outPath = path.join(outDir, `${slug}.html`);
      const result = await buildPage({
        src, outPath, section, project, basePathToHtml: '../',
      });
      built.push(result);
    }
    sectionResults.push({ ...section, files: built });
  }

  const standaloneResults = [];
  for (const item of STANDALONE) {
    const src = path.join(DOCS, item.src);
    if (!(await fs.stat(src).catch(() => null))) continue;
    const outPath = path.join(OUT, `${item.slug}.html`);
    const result = await buildPage({
      src, outPath,
      section: { title: project },
      project,
      basePathToHtml: './',
      overrideTitle: item.title,
    });
    standaloneResults.push(result);
  }

  await buildIndex({ project, sectionResults, standaloneResults });

  const total = sectionResults.reduce((s, sec) => s + sec.files.length, 0) + standaloneResults.length;
  console.log(`[build-docs-html] generated ${total} HTML pages across ${SECTIONS.length} sections + ${standaloneResults.length} top-level`);
}

main().catch((err) => {
  console.error('[build-docs-html] failed:', err);
  process.exit(1);
});
