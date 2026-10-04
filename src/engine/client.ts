import type { Engine } from './engine';
import type { Method, Req, Res } from './worker';

type Async<F> = F extends (...a: infer A) => infer R ? (...a: A) => Promise<Awaited<R>> : never;
export type EngineClient = { [K in Method]: Async<Engine[K]> };

/** Talks to the engine in a Web Worker so parsing and aggregation never block the page. */
export function connectEngine(): EngineClient {
  const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
  const pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>();
  let seq = 0;
  worker.onmessage = (e: MessageEvent<Res>) => {
    const p = pending.get(e.data.id); if (!p) return;
    pending.delete(e.data.id);
    if (e.data.ok) p.resolve(e.data.result); else p.reject(new Error(e.data.error));
  };
  worker.onerror = e => {
    const err = new Error(e.message || '処理用のスレッドでエラーが発生しました。');
    for (const p of pending.values()) p.reject(err);
    pending.clear();
  };
  const call = (method: Method) => (...args: unknown[]) => new Promise((resolve, reject) => {
    const id = ++seq; pending.set(id, { resolve, reject });
    worker.postMessage({ id, method, args } satisfies Req);
  });
  const methods: Method[] = ['addFiles', 'removeFile', 'updateFile', 'setSaved', 'query', 'exportXlsx'];
  return Object.fromEntries(methods.map(m => [m, call(m)])) as EngineClient;
}
