import { defineConfig, type Plugin } from 'vite';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';

// Data never leaves the browser: the production page forbids all network access.
const CSP = [
  "default-src 'none'",
  "script-src 'self' 'unsafe-eval'", // ExcelJS bundle relies on eval-like helpers
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "connect-src 'none'",
  "worker-src 'self'",
  "manifest-src 'self'",
  "base-uri 'none'",
  "form-action 'none'",
].join('; ');

const csp = (): Plugin => ({
  name: 'inject-csp',
  apply: 'build',
  transformIndexHtml: html => html.replace('<!--csp-->', `<meta http-equiv="Content-Security-Policy" content="${CSP}">`),
});

/** Emits sw.js with the exact list of built files to precache; the version changes whenever any file does. */
const serviceWorker = (): Plugin => ({
  name: 'service-worker',
  apply: 'build',
  generateBundle(_, bundle) {
    const files = ['./', ...Object.keys(bundle).filter(f => !f.endsWith('.map')), ...readdirSync('public')].sort();
    const hash = createHash('sha256');
    for (const f of readdirSync('public')) hash.update(f).update(readFileSync(`public/${f}`));
    for (const f of Object.values(bundle)) hash.update(f.fileName).update(f.type === 'chunk' ? f.code : f.source);
    const code = readFileSync('pwa/sw.js', 'utf8')
      .replace('__VERSION__', hash.digest('hex').slice(0, 12))
      .replace('__FILES__', JSON.stringify(files.filter(f => f !== 'index.html')));
    this.emitFile({ type: 'asset', fileName: 'sw.js', source: code });
  },
});

export default defineConfig({
  base: './',
  build: { modulePreload: { polyfill: false }, chunkSizeWarningLimit: 1200 },
  worker: { format: 'es' },
  plugins: [csp(), serviceWorker()],
  test: { environment: 'node' },
});
