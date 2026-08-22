#!/usr/bin/env node
/**
 * Build static HTML for every markdown file under `docs/`.
 *
 * Output: `docs/html/<relative path>.html` mirroring the MD source tree, plus a
 *         top-level `docs/html/index.html` linking everything.
 *
 * Sections are DISCOVERED automatically:
 *   - every sub-directory of `docs/` (except `docs/html`) that contains markdown
 *     becomes a section (recursively), titled from the folder name;
 *   - markdown files directly inside `docs/` are grouped into an "Overview" section.
 * This keeps the script project-agnostic — it works whether a repo uses
 * architecture/guides/audits folders, custom folders, or only top-level files.
 *
 * Styling matches the loons-and-blooms docs: editorial typography, warm palette,
 * numbered section headers, auto TOC sidebar (3+ h2), and a FULL-WIDTH shell with
 * comfortable side padding so text never touches the viewport edge.
 *
 * Hand-authored HTML already in `docs/html/` is preserved; only markdown is converted.
 *
 * Run with: `bun run docs:html`
 */

import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { marked } from 'marked'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT = path.resolve(__dirname, '..')
const DOCS = path.join(ROOT, 'docs')
const OUT = path.join(DOCS, 'html')
const TOKENS_SRC = path.join(ROOT, 'docs', 'html', 'design-tokens.css')

// ── HTML helpers ─────────────────────────────────────────────────────────
function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

function prettify(name) {
  return name
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

// ── Marked renderer overrides ────────────────────────────────────────────
function buildRenderer() {
  const renderer = new marked.Renderer()
  let h2Counter = 0

  renderer.heading = ({ tokens, depth }) => {
    const text = marked.Parser.parseInline(tokens)
    const plain = tokens.map((t) => t.text || '').join('')
    const id = slugify(plain)
    if (depth === 2) {
      h2Counter += 1
      const num = String(h2Counter).padStart(2, '0')
      return `
<section class="he-section" id="${id}">
  <div class="he-section__num">${num} · ${escapeHtml(plain)}</div>
  <h2 class="he-section__title">${text}</h2>`
    }
    return `<h${depth} id="${id}">${text}</h${depth}>`
  }

  renderer.link = ({ href, title, tokens }) => {
    const text = marked.Parser.parseInline(tokens)
    let finalHref = href
    if (finalHref && /\.md(#|$)/i.test(finalHref) && !/^https?:/i.test(finalHref)) {
      finalHref = finalHref.replace(/\.md(?=#|$)/i, '.html')
    }
    const titleAttr = title ? ` title="${escapeHtml(title)}"` : ''
    return `<a href="${escapeHtml(finalHref)}"${titleAttr}>${text}</a>`
  }

  renderer.codespan = ({ text }) => `<code>${escapeHtml(text)}</code>`

  renderer.blockquote = ({ tokens }) => {
    const body = marked.Parser.parse(tokens)
    const isPull = /^<p><strong>/.test(body.trim())
    return isPull ? `<blockquote class="he-pull">${body}</blockquote>` : `<blockquote>${body}</blockquote>`
  }

  return { renderer, resetCounter: () => { h2Counter = 0 } }
}

// ── TOC extraction ───────────────────────────────────────────────────────
function extractToc(md) {
  const out = []
  for (const line of md.split('\n')) {
    const m = line.match(/^(##|###)\s+(.+?)\s*$/)
    if (m) {
      const depth = m[1].length
      const text = m[2].replace(/^[#`*\s]+|[`*\s]+$/g, '')
      out.push({ depth, text, id: slugify(text) })
    }
  }
  return out
}

function parseHeader(md, slug, section) {
  const h1Match = md.match(/^#\s+(.+)$/m)
  const title = h1Match ? h1Match[1].trim() : prettify(slug)
  const afterH1 = h1Match ? md.slice((h1Match.index ?? 0) + h1Match[0].length) : md
  const paragraphs = afterH1.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)
  const deckCandidate = paragraphs.find(
    (p) => !p.startsWith('#') && !p.startsWith('```') && !p.startsWith('|') && !p.startsWith('- ') && !p.startsWith('> ')
  )
  let deckMarkdown = ''
  if (deckCandidate) {
    const oneLine = deckCandidate.replace(/\s+/g, ' ')
    const sentenceEnd = oneLine.match(/^([^.!?`]+(?:`[^`]*`[^.!?`]*)*[.!?])(?=\s|$)/)
    if (sentenceEnd) {
      deckMarkdown = sentenceEnd[1]
    } else {
      let slice = oneLine.slice(0, 240)
      const lastOpenBracket = slice.lastIndexOf('[')
      const lastCloseParen = slice.lastIndexOf(')')
      if (lastOpenBracket > lastCloseParen) slice = slice.slice(0, lastOpenBracket).trimEnd()
      const lastTick = slice.lastIndexOf('`')
      if (lastTick > -1 && (slice.match(/`/g) || []).length % 2 === 1) slice = slice.slice(0, lastTick).trimEnd()
      const lastSpace = slice.lastIndexOf(' ')
      if (lastSpace > 200) slice = slice.slice(0, lastSpace)
      deckMarkdown = slice.replace(/[,:;\s]+$/, '') + '…'
    }
  }
  const eyebrow = section ? section.title : 'Document'
  return { title, deckMarkdown, eyebrow }
}

function stripHeader(md) {
  let out = md.replace(/^#\s+[^\n]+\n+/, '')
  const m = out.match(/^([^\n]+(?:\n[^\n]+)*)\n\s*\n/)
  if (m) {
    const first = m[1].trimStart()
    if (
      !first.startsWith('#') && !first.startsWith('```') && !first.startsWith('|') &&
      !first.startsWith('- ') && !first.startsWith('* ') && !first.startsWith('> ')
    ) {
      out = out.slice(m[0].length)
    }
  }
  return out
}

// ── Navigation (built dynamically from discovered sections) ───────────────
function buildNav(sections, base, project) {
  const links = [`<a href="${base}index.html">Index</a>`].concat(
    sections.map((s) => `<a href="${base}index.html#${s.id}">${escapeHtml(s.title)}</a>`)
  )
  return `
<nav class="he-nav">
  <a class="he-nav__brand" href="${base}index.html">${escapeHtml(project)} <small>docs</small></a>
  <div class="he-nav__links">
    ${links.join('\n    ')}
  </div>
</nav>`
}

// ── Page template ────────────────────────────────────────────────────────
function pageHtml({ title, eyebrow, deckHtml, body, toc, project, basePathToHtml, isIndex, navHtml }) {
  const tocHtml =
    toc && toc.length >= 3
      ? `
<aside class="he-toc" aria-label="On this page">
  <p class="he-toc__label">On this page</p>
  <ul>
    ${toc.map((t) => `<li class="he-toc__l${t.depth}"><a href="#${t.id}">${escapeHtml(t.text)}</a></li>`).join('\n    ')}
  </ul>
</aside>`
      : ''

  const useTwoCol = !!tocHtml && !isIndex
  const layoutOpen = useTwoCol ? '<div class="he-layout">' : ''
  const layoutClose = useTwoCol ? '</div>' : ''
  const mainOpen = useTwoCol ? '<main class="he-main">' : '<main>'
  const mainClose = '</main>'

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${escapeHtml(title)} · ${escapeHtml(project)}</title>
<link rel="stylesheet" href="${basePathToHtml}design-tokens.css">
<link rel="stylesheet" href="${basePathToHtml}docs.css">
</head>
<body>
<div class="he-shell ${useTwoCol ? 'he-shell--wide' : ''}">
${navHtml}
${layoutOpen}
${mainOpen}
<header>
  <p class="he-eyebrow">${escapeHtml(eyebrow)}</p>
  <h1 class="he-title">${escapeHtml(title)}</h1>
  ${deckHtml ? `<p class="he-deck">${deckHtml}</p>` : ''}
</header>
${body}
${mainClose}
${tocHtml}
${layoutClose}
<footer class="he-foot">
  Source · <a href="${basePathToHtml}../">browse the markdown</a> · rebuild with <code>bun run docs:html</code>
</footer>
</div>
</body>
</html>
`
}

// ── Extra CSS: full-width shell + comfortable side padding, TOC, index grid ─
const SITE_CSS = `/* Docs-site extensions to design-tokens.css (linked AFTER it, so these win). */

/* Full-width shell. design-tokens.css caps .he-shell at --col-default/--col-wide;
   here we remove the cap and use fluid side padding so the text is full width but
   never touches the screen edge (min 24px, grows with the viewport, max 64px). */
.he-shell,
.he-shell--narrow,
.he-shell--wide {
  max-width: none;
  padding-left: clamp(var(--sp-5), 4vw, var(--sp-8));
  padding-right: clamp(var(--sp-5), 4vw, var(--sp-8));
}

.he-layout { display: grid; grid-template-columns: 1fr; gap: var(--sp-6); }
@media (min-width: 1024px) { .he-layout { grid-template-columns: 1fr 220px; } }
.he-main { min-width: 0; }

.he-toc {
  position: sticky; top: var(--sp-5); align-self: start;
  padding: var(--sp-4) 0 var(--sp-4) var(--sp-4);
  border-left: 1px solid var(--border);
  font-size: var(--t-small-size);
  max-height: calc(100vh - var(--sp-7)); overflow-y: auto;
}
.he-toc__label { font-size: var(--t-caption-size); letter-spacing: var(--t-caption-tracking); text-transform: uppercase; color: var(--fg-muted); margin: 0 0 var(--sp-3); }
.he-toc ul { list-style: none; padding: 0; margin: 0; }
.he-toc li { margin: var(--sp-2) 0; }
.he-toc__l3 { padding-left: var(--sp-3); }
.he-toc a { color: var(--fg-muted); border: 0; }
.he-toc a:hover { color: var(--clay); }

.he-index-section { margin-top: var(--sp-7); }
.he-index-section__head {
  display: flex; align-items: baseline; justify-content: space-between;
  gap: var(--sp-4); margin-bottom: var(--sp-4); padding-bottom: var(--sp-3);
  border-bottom: 1px solid var(--border);
}
.he-index-section__head h2 { margin: 0; font-size: var(--t-h2-size); font-weight: 500; }
.he-index-section__blurb { color: var(--fg-muted); font-size: var(--t-small-size); margin: 0; max-width: 50ch; text-align: right; }

.he-standalone-grid { display: grid; gap: var(--sp-3); grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); }
.he-standalone-card { padding: var(--sp-4) var(--sp-4); background: var(--surface); border: 1px solid var(--border); border-radius: var(--r-md); }
.he-standalone-card a { font-weight: 500; }
.he-standalone-card p { font-size: var(--t-small-size); color: var(--fg-muted); margin: var(--sp-1) 0 0; }
`

// ── File walking ─────────────────────────────────────────────────────────
async function walkMd(dir) {
  const out = []
  const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => [])
  for (const ent of entries) {
    const full = path.join(dir, ent.name)
    if (ent.isDirectory()) out.push(...(await walkMd(full)))
    else if (ent.name.endsWith('.md')) out.push(full)
  }
  return out.sort()
}

async function topLevelMd(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => [])
  return entries
    .filter((e) => e.isFile() && e.name.endsWith('.md'))
    .map((e) => path.join(dir, e.name))
    .sort()
}

// ── Discover sections ─────────────────────────────────────────────────────
async function discoverSections() {
  const entries = await fs.readdir(DOCS, { withFileTypes: true }).catch(() => [])
  const sections = []

  const top = await topLevelMd(DOCS)
  if (top.length) sections.push({ id: 'overview', dir: '', title: 'Overview', blurb: 'Top-level documents.' })

  const dirs = entries.filter((e) => e.isDirectory() && e.name !== 'html').map((e) => e.name).sort()
  for (const dir of dirs) {
    const files = await walkMd(path.join(DOCS, dir))
    if (files.length) sections.push({ id: slugify(dir), dir, title: prettify(dir), blurb: `${files.length} document${files.length === 1 ? '' : 's'}.` })
  }
  return sections
}

// ── Build one MD file ────────────────────────────────────────────────────
async function buildPage({ src, section, project, sections }) {
  const relFromDocs = path.relative(DOCS, src).replaceAll('\\', '/')
  const relHtml = relFromDocs.replace(/\.md$/i, '.html')
  const outPath = path.join(OUT, relHtml)
  const depth = relHtml.split('/').length - 1
  const basePathToHtml = depth === 0 ? './' : '../'.repeat(depth)

  const md = await fs.readFile(src, 'utf8')
  const { title, deckMarkdown, eyebrow } = parseHeader(md, path.basename(src, '.md'), section)
  const toc = extractToc(md)
  const stripped = stripHeader(md)

  const { renderer, resetCounter } = buildRenderer()
  resetCounter()
  const body = marked.parse(stripped, { gfm: true, renderer })
  const deckHtml = deckMarkdown ? marked.parseInline(deckMarkdown, { gfm: true }) : ''

  const html = pageHtml({
    title, eyebrow, deckHtml, body, toc, project,
    basePathToHtml, isIndex: false,
    navHtml: buildNav(sections, basePathToHtml, project),
  })

  await fs.mkdir(path.dirname(outPath), { recursive: true })
  await fs.writeFile(outPath, html, 'utf8')
  return { slug: path.basename(src, '.md'), title, deck: deckMarkdown, relHtml, srcRelative: path.relative(ROOT, src).replaceAll('\\', '/') }
}

// ── Build the index ────────────────────────────────────────────────────────
async function buildIndex({ project, sections, sectionResults }) {
  const sectionsHtml = sectionResults
    .map((s) => {
      const cards = s.files
        .map(
          (f) => `
    <a class="he-card" href="./${f.relHtml}">
      <div class="he-card__eyebrow">${escapeHtml(s.title)}</div>
      <h3>${escapeHtml(f.title)}</h3>
      <p>${escapeHtml((f.deck || '').slice(0, 180))}</p>
      <div class="he-card__meta"><span>${escapeHtml(f.srcRelative)}</span></div>
    </a>`
        )
        .join('')
      return `
<section class="he-index-section" id="${s.id}">
  <div class="he-index-section__head">
    <h2>${escapeHtml(s.title)}</h2>
    <p class="he-index-section__blurb">${escapeHtml(s.blurb)}</p>
  </div>
  <div class="he-grid">${cards}
  </div>
</section>`
    })
    .join('\n')

  // Hand-authored HTML at the root of /html/ — exclude generated pages.
  const generatedRoot = new Set(
    sectionResults.flatMap((s) => s.files).filter((f) => !f.relHtml.includes('/')).map((f) => f.relHtml)
  )
  const rootEntries = await fs.readdir(OUT, { withFileTypes: true }).catch(() => [])
  const handAuthored = rootEntries
    .filter((e) => e.isFile() && e.name.endsWith('.html') && e.name !== 'index.html' && !generatedRoot.has(e.name))
    .map((e) => e.name)

  const standalone =
    handAuthored.length > 0
      ? `
<section class="he-index-section" id="standalone">
  <div class="he-index-section__head">
    <h2>Standalone HTML</h2>
    <p class="he-index-section__blurb">Hand-authored visual reports — not derived from markdown.</p>
  </div>
  <div class="he-standalone-grid">
    ${handAuthored
      .map((f) => `<div class="he-standalone-card"><a href="./${f}">${escapeHtml(f.replace(/-/g, ' ').replace('.html', ''))}</a><p>↗ open report</p></div>`)
      .join('\n    ')}
  </div>
</section>`
      : ''

  const total = sectionResults.reduce((s, sec) => s + sec.files.length, 0)
  const body = `
<div class="he-kpis">
  <div class="he-kpi"><div class="he-kpi__value">${total}</div><div class="he-kpi__label">Generated pages</div></div>
  <div class="he-kpi"><div class="he-kpi__value">${sectionResults.length}</div><div class="he-kpi__label">Sections</div></div>
  <div class="he-kpi"><div class="he-kpi__value">${handAuthored.length}</div><div class="he-kpi__label">Standalone reports</div></div>
</div>
${sectionsHtml}
${standalone}
`

  const html = pageHtml({
    title: 'Documentation',
    eyebrow: `${project} · docs`,
    deckHtml: 'All project documentation, generated from the markdown under <code>docs/</code> and organised by folder.',
    body, toc: [], project, basePathToHtml: './', isIndex: true,
    navHtml: buildNav(sections, './', project),
  })
  await fs.writeFile(path.join(OUT, 'index.html'), html, 'utf8')
}

// ── Main ─────────────────────────────────────────────────────────────────
async function readProjectName() {
  try {
    const pkg = JSON.parse(await fs.readFile(path.join(ROOT, 'package.json'), 'utf8'))
    if (pkg.name) return prettify(pkg.name)
  } catch {}
  return 'Project'
}

async function main() {
  const project = await readProjectName()
  await fs.mkdir(OUT, { recursive: true })

  const tokens = await fs.readFile(TOKENS_SRC, 'utf8').catch(() => null)
  if (tokens == null) {
    console.error(`[build-docs-html] missing ${path.relative(ROOT, TOKENS_SRC)} — cannot style the docs.`)
    process.exit(1)
  }
  await fs.writeFile(path.join(OUT, 'design-tokens.css'), tokens, 'utf8')
  await fs.writeFile(path.join(OUT, 'docs.css'), SITE_CSS, 'utf8')

  const sections = await discoverSections()
  if (sections.length === 0) {
    console.warn('[build-docs-html] no markdown found under docs/. Nothing to generate.')
  }

  const sectionResults = []
  for (const section of sections) {
    const files = section.dir ? await walkMd(path.join(DOCS, section.dir)) : await topLevelMd(DOCS)
    const built = []
    for (const src of files) built.push(await buildPage({ src, section, project, sections }))
    sectionResults.push({ ...section, files: built })
  }

  await buildIndex({ project, sections, sectionResults })

  const total = sectionResults.reduce((s, sec) => s + sec.files.length, 0)
  console.log(
    `[build-docs-html] generated ${total} HTML pages + index across ${sectionResults.length} sections (design-tokens + docs.css written into docs/html/)`
  )
}

main().catch((err) => {
  console.error('[build-docs-html] failed:', err)
  process.exit(1)
})
