import { $, esc } from '../util';

const tip = () => $('tip');
export function showTip(e: MouseEvent, html: string) {
  const t = tip(); t.innerHTML = html; t.hidden = false;
  const w = t.offsetWidth, h = t.offsetHeight;
  let x = e.clientX + 14, y = e.clientY - h - 10;
  if (x + w > innerWidth - 8) x = e.clientX - w - 14;
  if (y < 8) y = e.clientY + 16;
  t.style.left = Math.max(8, x) + 'px'; t.style.top = y + 'px';
}
export function hideTip() { tip().hidden = true; }

/** Elements with data-tip="title|body" get a hover tooltip. */
export function initTips() {
  document.addEventListener('mousemove', e => {
    const el = (e.target as Element).closest?.('[data-tip]') as HTMLElement | null;
    if (el) { const [a, b] = el.dataset.tip!.split('|'); showTip(e, `<b>${esc(a)}</b>${esc(b || '')}`); }
    else if (!(e.target as Element).closest?.('#series')) hideTip();
  });
}

let toastT: ReturnType<typeof setTimeout>;
export function toast(msg: string) {
  const t = $('toast'); t.textContent = msg; t.hidden = false;
  clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, 4500);
}
