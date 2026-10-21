import { defineConfig } from 'astro/config';
import { unified } from '@astrojs/markdown-remark';
import articleMarkdown from './src/plugins/article-markdown.mjs';

// No production domain has been selected. Do not derive one from import URLs.
export default defineConfig({
  output: 'static',
  publicDir: './static',
  trailingSlash: 'always',
  markdown: {
    syntaxHighlight: false,
    processor: unified({ smartypants: false, remarkPlugins: [articleMarkdown] }),
  },
});
