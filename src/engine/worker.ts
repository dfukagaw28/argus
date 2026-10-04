import { Engine, isChunkLoadError, preloadLazyModules, STALE_MESSAGE } from './engine';

export type Method = 'addFiles' | 'removeFile' | 'updateFile' | 'setSaved' | 'query' | 'exportXlsx';
export interface Req { id: number; method: Method; args: unknown[] }
export type Res = { id: number; ok: true; result: unknown } | { id: number; ok: false; error: string };

const engine = new Engine();
// typed by hand: the webworker lib would clash with the DOM lib used by the page
const scope = self as unknown as {
  onmessage: ((e: MessageEvent<Req>) => void) | null;
  postMessage(msg: Res, transfer: Transferable[]): void;
};

// Requests run one at a time, so a query never sees a half-loaded set of files.
let chain = Promise.resolve();
scope.onmessage = (e: MessageEvent<Req>) => {
  const { id, method, args } = e.data;
  chain = chain.then(async () => {
    try {
      const result = await (engine[method] as (...a: unknown[]) => unknown)(...args);
      scope.postMessage({ id, ok: true, result } satisfies Res, result instanceof ArrayBuffer ? [result] : []);
    } catch (err) {
      const error = isChunkLoadError(err) ? STALE_MESSAGE : (err as Error)?.message || String(err);
      scope.postMessage({ id, ok: false, error } satisfies Res, []);
    }
  });
};

// after the first screen is drawn, fetch the Excel chunks while they are still on the server
setTimeout(() => { preloadLazyModules().catch(() => { /* retried on demand */ }); }, 500);
