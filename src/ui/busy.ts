import { $ } from '../util';

let n = 0, label = '', timer: ReturnType<typeof setTimeout> | undefined;
function show() { const el = $('busy'); el.textContent = label || '集計中…'; el.hidden = false; document.body.setAttribute('aria-busy', 'true'); }

/** Shows a status line while `p` runs; quick operations (<200 ms) never flash it. */
export async function busy<T>(p: Promise<T>, text = ''): Promise<T> {
  if (text) label = text;
  if (n++ === 0) timer = setTimeout(show, 200);
  try { return await p; }
  finally {
    if (--n === 0) { clearTimeout(timer); label = ''; $('busy').hidden = true; document.body.removeAttribute('aria-busy'); }
  }
}
