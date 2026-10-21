import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { load } from 'cheerio';

test('linked article images have an accessible name', () => {
  for (const slug of readdirSync('dist/posts')) {
    const $ = load(readFileSync(`dist/posts/${slug}/index.html`, 'utf8'));
    $('.prose a:has(img)').each((_, link) => {
      const name = $(link).attr('aria-label') || $(link).text().trim() || $(link).find('img').attr('alt');
      assert.ok(name?.trim(), `${slug}: linked image has no accessible name`);
    });
  }
});

test('theme labels contain text and an associated control on every page', () => {
  const pages = ['dist/index.html', ...readdirSync('dist/posts').map(slug => `dist/posts/${slug}/index.html`)];
  for (const page of pages) {
    const $ = load(readFileSync(page, 'utf8'));
    $('.theme-switch label').each((_, label) => {
      assert.ok($(label).text().trim(), `${page}: icon-only label needs text`);
      assert.equal($(label).find('input[type="radio"]').length, 1);
      assert.equal($(label).find('.sr-only').text().trim(), $(label).find('input').attr('aria-label'));
    });
  }
});
