import { $, esc, fmt1, fmtInt, ymd } from '../util';
import { ROLES } from '../schema/roles';
import type { Agg } from '../model/types';
import { state } from '../state';

export function renderFiles() {
  $('files').innerHTML = state.files.map(f => {
    const found = ROLES.filter(r => f.map[r.k] >= 0).map(r => r.label);
    const m = f.map, weak = !(m.userId >= 0 || m.email >= 0 || m.name >= 0 || m.video >= 0 || m.videoId >= 0 || m.time >= 0);
    const opts = (k: keyof typeof m) => `<option value="-1">（使わない）</option>` +
      f.headers.map((h, i) => `<option value="${i}"${m[k] === i ? ' selected' : ''}>${esc(h || `列 ${i + 1}`)}</option>`).join('');
    return `<div class="file"><div class="file-head"><b>${esc(f.name)}</b>
      <span class="file-meta">${fmtInt(f.rows.length)} 行　<button class="btn link" type="button" data-rm="${f.id}">取り除く</button></span></div>
      <div class="file-meta">${weak ? '<b>列を自動で判別できませんでした。下の「列の対応」で指定してください。</b>' : '読み取った項目：' + esc(found.join('・'))}</div>
      <details${weak ? ' open' : ''}><summary>列の対応を直す</summary><div class="mapgrid">
      ${ROLES.map(r => `<label>${r.label}<select data-f="${f.id}" data-k="${r.k}">${opts(r.k)}</select></label>`).join('')}
      <label>視聴時間の単位<select data-f="${f.id}" data-k="__unit">
        ${[['min', '分'], ['sec', '秒'], ['hour', '時間']].map(([v, l]) => `<option value="${v}"${f.unit === v ? ' selected' : ''}>${l}</option>`).join('')}</select></label>
      </div></details></div>`;
  }).join('');
}

const hoursOrMin = (m: number): [string, string] => m >= 600 ? [fmt1(m / 60), '時間'] : [fmtInt(m), '分'];

export function renderKpis(a: Agg) {
  const [tv, tu] = hoursOrMin(a.min);
  const period = a.tMin && a.tMax ? `${ymd(a.tMin)} 〜 ${ymd(a.tMax)}` : '日付の列なし';
  const per = a.users.size ? hoursOrMin(a.min / a.users.size) : null;
  const tiles: [string, string, string, string][] = [
    ['視聴者', fmtInt(a.users.size), '人', a.users.size ? '' : '受講者の列なし'],
    ['動画', fmtInt(a.videos.size), '本', ''],
    ['視聴回数', fmtInt(a.views), '回', period],
    ['総視聴時間', tv, tu, per ? `1 人あたり ${per[0]} ${per[1]}` : ''],
    ['平均完了率', a.comp == null ? '—' : fmt1(a.comp), a.comp == null ? '' : '%', a.comp == null ? '完了率・動画の長さの列なし' : '視聴した動画あたり'],
  ];
  $('kpis').innerHTML = tiles.map(([l, v, u, s]) =>
    `<div class="kpi"><div class="lab">${l}</div><div class="val">${v}<small>${u}</small></div><div class="sub">${esc(s) || '&nbsp;'}</div></div>`).join('');
}
