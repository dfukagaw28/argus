import { $, fmt1, fmtInt, WD, wday } from '../util';
import { seriesData } from '../model/aggregate';
import type { AggCore } from '../model/types';
import { state } from '../state';
import { hideTip, showTip } from './tip';

export const cellStyle = (p: number) =>
  `background:color-mix(in oklab,var(--seq-to) ${Math.round(p)}%,var(--seq-from));color:var(${p > 45 ? '--cell-ink-hi' : '--cell-ink-lo'})`;

const METRIC = { views: ['視聴回数', '回'], min: ['視聴時間', '分'], users: ['視聴者数', '人'] } as const;

function niceStep(v: number) {
  if (v <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(v))), f = v / p;
  return Math.max(1, (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p);
}

export function renderSeries() {
  const box = $('series'), data = seriesData(state.agg, state.gran, state.metric), [mName, mUnit] = METRIC[state.metric];
  $('series-title').textContent = `${mName}の推移`;
  if (!data.length) { box.innerHTML = '<div class="empty">日付の列が見つからないため、推移は表示できません。</div>'; return; }
  const W = Math.max(300, box.clientWidth || 600), H = 230, L = 46, R = 8, T = 12, B = 26, pw = W - L - R, ph = H - T - B;
  const top = Math.max(...data.map(d => d.v)), step = niceStep(top / 4), max = Math.max(step, Math.ceil(top / step) * step);
  const slot = pw / data.length, bw = Math.max(1, Math.min(22, slot - 2));
  const y = (v: number) => T + ph - v / max * ph;
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${mName}の推移">`;
  for (let i = 0; i * step <= max + 1e-9; i++) {
    const v = i * step, yy = y(v);
    s += `<line class="${i ? 'grid-line' : 'base-line'}" x1="${L}" x2="${W - R}" y1="${yy}" y2="${yy}"/><text x="${L - 6}" y="${yy + 4}" text-anchor="end">${fmtInt(v)}</text>`;
  }
  const every = Math.max(1, Math.ceil(data.length / Math.max(2, Math.floor(pw / 78))));
  data.forEach((d, i) => {
    const x = L + slot * i + (slot - bw) / 2, h = d.v / max * ph, r = Math.min(4, bw / 2, h);
    s += `<rect class="hit" data-i="${i}" x="${L + slot * i}" y="${T}" width="${slot}" height="${ph}"/>`;
    s += h > 0 ? `<path class="bar" d="M${x},${T + ph}V${T + ph - h + r}q0,${-r} ${r},${-r}h${bw - 2 * r}q${r},0 ${r},${r}V${T + ph}z"/>` : `<path class="bar" d=""/>`;
    if (i % every === 0) s += `<text x="${L + slot * i + slot / 2}" y="${H - 8}" text-anchor="middle">${state.gran === 'month' ? d.k : d.k.slice(5).replace('-', '/')}</text>`;
  });
  box.innerHTML = s + '</svg>';
  box.onmousemove = e => {
    const t = (e.target as Element).closest('.hit') as SVGElement | null;
    if (!t) return hideTip();
    const d = data[+t.dataset.i!];
    const [yy, mm, dd] = d.k.split('-').map(Number);
    const lab = state.gran === 'week' ? `${d.k} の週` : state.gran === 'day' ? `${d.k}（${WD[wday(new Date(yy, mm - 1, dd))]}）` : d.k;
    showTip(e, `<b>${lab}</b>${mName} ${state.metric === 'min' ? fmt1(d.v) : fmtInt(d.v)} ${mUnit}`);
  };
  box.onmouseleave = hideTip;
}

export function renderHeat(a: AggCore) {
  const box = $('heat');
  if (!a.hasClock) { box.innerHTML = '<div class="empty">時刻つきの日時がないため、表示できません。</div>'; return; }
  const max = Math.max(1, ...a.heat.flat());
  let h = '<div class="heat"><span></span>' + Array.from({ length: 24 }, (_, i) => `<span class="h">${i % 3 ? '' : i}</span>`).join('');
  a.heat.forEach((row, d) => {
    h += `<span class="d">${WD[d]}</span>` + row.map((v, hr) =>
      `<div class="c" data-tip="${WD[d]}曜 ${hr}:00〜${hr}:59|視聴回数 ${fmtInt(v)} 回"${v ? ` style="${cellStyle(v / max * 100)}"` : ''}></div>`).join('');
  });
  box.innerHTML = h + '</div><p class="note" style="margin-top:8px">横軸は時刻（0〜23 時）。レポートに記録された時刻のまま集計しています。</p>';
}
