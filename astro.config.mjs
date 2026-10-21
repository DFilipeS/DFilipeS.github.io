import { defineConfig } from 'astro/config';
import { unified } from '@astrojs/markdown-remark';
import articleMarkdown from './src/plugins/article-markdown.mjs';

export default defineConfig({
  site: 'https://www.dfilipes.dev',
  output: 'static',
  publicDir: './static',
  trailingSlash: 'always',
  markdown: {
    syntaxHighlight: false,
    processor: unified({ smartypants: false, remarkPlugins: [articleMarkdown] }),
  },
});
