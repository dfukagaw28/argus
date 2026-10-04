import { $ } from './util';

/**
 * Registers the offline service worker. A new version waits until the user agrees,
 * because reloading would discard the files they have loaded.
 */
export function initPwa() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('./sw.js').then(reg => {
    const offer = (w: ServiceWorker | null) => { if (w && navigator.serviceWorker.controller) showUpdate(w); };
    offer(reg.waiting);
    reg.addEventListener('updatefound', () => {
      const w = reg.installing;
      w?.addEventListener('statechange', () => { if (w.state === 'installed') offer(w); });
    });
    // long-lived tabs: look for a new version every hour
    setInterval(() => reg.update().catch(() => {}), 3600_000);
  }).catch(() => { /* offline support is optional */ });

  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (!reloading) { reloading = true; location.reload(); } });
}

function showUpdate(w: ServiceWorker) {
  const el = $('update'); el.hidden = false;
  $('btn-update').onclick = () => w.postMessage({ type: 'skip-waiting' });
}

/** The open page is older than the published files and cannot fetch its own chunks: offer a reload. */
export function showStale(msg: string) {
  const el = $('update'); el.hidden = false;
  el.querySelector('span')!.textContent = msg;
  $('btn-update').textContent = '再読み込み';
  $('btn-update').onclick = () => location.reload();
  el.scrollIntoView({ block: 'nearest' });
}

/** Files opened from the OS ("Open with" on an installed app) arrive through the launch queue. */
export function initFileHandler(open: (files: File[]) => void) {
  const lq = (window as unknown as { launchQueue?: { setConsumer(cb: (p: { files: FileSystemFileHandle[] }) => void): void } }).launchQueue;
  lq?.setConsumer(async p => { if (p.files?.length) open(await Promise.all(p.files.map(h => h.getFile()))); });
}
