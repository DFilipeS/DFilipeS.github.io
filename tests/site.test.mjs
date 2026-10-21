import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { load } from 'cheerio';
const read = p => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const baseline = JSON.parse(read('tests/fixtures/pre-astro.json'));
const norm = s => s.replace(/\s+/g, ' ').trim();
// Python-Markdown discarded whitespace-only code lines. Ignore that historical
// renderer quirk while requiring all other code and indentation to match.
const codeText = s => s.trimEnd().split('\n').map(line => line.trim() ? line : '').join('\n');

test('Astro content collection preserves every article body byte after frontmatter', () => {
  assert.ok(existsSync('src/content.config.ts'), 'Astro content collection must exist');
  for (const [slug, source] of Object.entries(baseline)) {
    const md = read(`content/posts/${slug}.md`);
    assert.ok(md.startsWith('---\n'), 'metadata belongs in Markdown frontmatter');
    const body = md.slice(md.indexOf('\n---\n', 4) + 5);
    assert.equal(createHash('sha256').update(body).digest('hex'), source.sha256, slug);
  }
});

test('all generated articles preserve text, code, images, dates, captions and visible contents', () => {
  for (const [slug, source] of Object.entries(baseline)) {
    const old = load(source.html);
    const html = read(`dist/posts/${slug}/index.html`);
    const $ = load(html);
    assert.equal($('h1').length, 1);
    assert.equal($('h1').text(), old('h1').text());
    // This essay received a publication date after the migration snapshot.
    // Keep the historical fixture intact for the body-preservation checks.
    const expectedMeta = slug === 'how-software-engineering-is-changing'
      ? 'October 22, 2026'
      : old('.meta').text();
    assert.equal($('.meta').text(), expectedMeta, `${slug} publication metadata`);
    if (slug === 'how-software-engineering-is-changing') {
      assert.match(read(`content/posts/${slug}.md`), /^date: '2026-10-22'$/m);
    }
    assert.equal($('.article-note').text(), old('.article-note').text());
    assert.equal($('.article-note a').attr('href'), old('.article-note a').attr('href'));
    const prose = $('.prose').clone(); prose.find('.article-end').remove();
    const oldProse = old('.prose').clone(); oldProse.find('.article-end').remove();
    assert.equal(norm(prose.text()), norm(oldProse.text()), `${slug} full prose`);
    assert.deepEqual($('.prose pre code').map((_, e) => codeText($(e).text())).get(), old('.prose pre code').map((_, e) => codeText(old(e).text())).get(), `${slug} code`);
    assert.deepEqual($('.prose img').map((_,e) => $(e).attr('src')).get(), old('.prose img').map((_,e) => old(e).attr('src')).get());
    assert.deepEqual($('figcaption').map((_,e) => norm($(e).text())).get(), old('figcaption').map((_,e) => norm(old(e).text())).get());
    assert.deepEqual($('figcaption a').map((_,e) => $(e).attr('href')).get(), old('figcaption a').map((_,e) => old(e).attr('href')).get());
    assert.equal($('.article-toc[aria-label="Table of contents"]').length, 1);
    assert.equal($('details,summary').length, 0);
    for (const a of $('.article-toc a')) assert.equal($(`[id="${$(a).attr('href').slice(1)}"]`).length, 1);
    for (const img of $('img')) { const src = $(img).attr('src'); assert.ok(src.startsWith('/images/')); assert.ok(existsSync('dist'+src)); }
  }
});

test('shared design, local assets, metadata and footer remain intact', () => {
  const home = load(read('dist/index.html'));
  assert.equal(home('#intro-title').text(), 'Daniel Silva, with a few notes.');
  assert.equal(home('#intro-title em').text(), 'with a few notes.');
  for (const slug of Object.keys(baseline)) assert.equal(home(`a[href="/posts/${slug}/"]`).length, 1);
  for (const path of ['dist/index.html', ...Object.keys(baseline).map(s => `dist/posts/${s}/index.html`)]) {
    const html = read(path), $ = load(html);
    assert.deepEqual($('.main-nav a').map((_,e)=>$(e).text()).get(), ['Writing','Speaking']);
    assert.deepEqual($('.social-links a').map((_,e)=>$(e).attr('href')).get(), ['https://github.com/DFilipeS','https://x.com/DFilipeS','https://www.linkedin.com/in/dfilipes']);
    assert.equal($('.theme-icon').length, 3);
    for (const mode of ['light','dark','system']) assert.equal($(`input[name="theme"][value="${mode}"]`).length,1);
    assert.ok(html.indexOf('localStorage.getItem') < html.indexOf('href="/style.css"'));
    assert.equal($('script[src="/theme.js"]').length, 1);
    assert.equal($('[rel="canonical"],[property="og:url"]').length, 0, 'No invented production domain');
    assert.equal($('[name="robots"]').attr('content'), 'noindex, nofollow');
  }
  for (const p of ['style.css','theme.js']) assert.equal(read('dist/'+p),read('static/'+p));
  for (const m of read('dist/style.css').matchAll(/url\('([^']+)'\)/g)) assert.ok(existsSync('dist'+m[1]));
  assert.match(read('static/style.css'), /grid-template-areas:'contents' 'body'/);
  assert.match(read('static/style.css'), /last-child\{border-bottom:0\}/);
});
