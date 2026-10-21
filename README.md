# Daniel Silva — personal website

An Astro static site: one homepage, four complete Markdown articles, and the ElixirConf EU 2023 talk. No React or client framework. The approved CSS, locally served fonts and images, and small Light/Dark/System script are unchanged. Design decisions remain in `DESIGN-NOTES.md`.

## Run

Use a Node version supported by Astro 7 (verified here with Node 26.12.1 and npm 11.20.0).

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:4321/. The dev server binds only to loopback.

```sh
npm run build       # static output in dist/
npm test            # fresh Astro build + Node test runner
npm run preview     # serve the production build on loopback
```

Pages retain `noindex, nofollow` during review; remove that restriction only for a deliberate public launch. No production domain is configured. RSS, canonical URLs and social metadata are intentionally deferred rather than inventing a domain or treating an original publication URL as this site's domain. Configure an agreed production `site` in `astro.config.mjs` before implementing those launch features. The undated essay must also receive an agreed publication date before inclusion in a dated RSS feed.

## Content and structure

- `content/posts/*.md`: Astro content collection entries. Frontmatter contains titles, descriptions, original dates/URLs/platforms, labels and explicit homepage order. The new essay's date is deliberately `null`.
- `src/content.config.ts`: validates frontmatter and loads the existing Markdown directory.
- `src/layouts/Site.astro`: shared accessible header, appearance controls and social footer.
- `src/pages/index.astro`, `src/pages/posts/[slug].astro`: static homepage and article routes, including the always-visible responsive contents index.
- `src/plugins/article-markdown.mjs`: shifts headings one level to retain one page-level h1 and renders only the four explicitly identified source captions as semantic figures. Attribution links are preserved; ordinary image-following prose is not guessed to be a caption.
- `static/`: original CSS, theme script, licensed local fonts and nine article images/GIFs, copied by Astro without processing.
- `content/migration-sources.json`, `content/imports/`: retained import provenance, original image URLs, source snapshots and recovered source code. These are not published by the build.
- `tests/fixtures/pre-astro.json`: immutable pre-migration HTML and SHA-256 body digests captured before implementation. Tests compare every article's full rendered text, code, captions/credit links, images, original dates and source links, and verify all Markdown bodies byte-for-byte after removing only frontmatter. The new essay's original body hash remains `cf3146fa0ab0bf358d2c0b3bd29c53f01d0198fee167bec0338162954e3423e8`.

All article bodies are unchanged, including the eleven recovered Medium Gist snippets, Substack code blocks, and LiveView article's 23 original code blocks. Python-Markdown previously stripped spaces from otherwise blank code lines; Astro preserves the actual source whitespace. The regression comparison normalizes only that historical rendering difference.

The obsolete Python generator, caption extension, dependency file, Python tests, duplicated JSON metadata and one-time import scripts were removed. Retained Markdown, assets and source manifests are sufficient for repeatable offline-content builds; there is no dependency on old Downloads files, web caches or import-time network requests. `IDEA.md` is unchanged. No deployment or changes to the existing Medium/Substack publications were made.
