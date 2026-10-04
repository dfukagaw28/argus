import { defineConfig } from 'vite';

// Data never leaves the browser: the production page forbids all network access.
const CSP = [
  "default-src 'none'",
  "script-src 'self' 'unsafe-eval'", // ExcelJS bundle relies on eval-like helpers
  "style-src 'self' 'unsafe-inline'",
  'img-src data: blob:',
  "connect-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join('; ');

export default defineConfig({
  base: './',
  build: { modulePreload: { polyfill: false }, chunkSizeWarningLimit: 1200 },
  plugins: [{
    name: 'inject-csp',
    apply: 'build',
    transformIndexHtml: html => html.replace('<!--csp-->', `<meta http-equiv="Content-Security-Policy" content="${CSP}">`),
  }],
  test: { environment: 'node' },
});
