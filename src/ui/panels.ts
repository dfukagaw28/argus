import { $, esc, fmt1, fmtInt, ymd } from '../util';
import { ROLES } from '../schema/roles';
import type { AggCore } from '../model/types';
import { state } from '../state';

export function renderFiles() {
  const dupes = state.dupes ? `<div class="notice"><span>ほかのファイルと重なっていた <b>${fmtInt(state.dupes)} 件</b>の記録は、二重に数えないよう除いています。</span></div>` : '';
  $('files').innerHTML = dupes + state.files.map(f => {
    const roster = f.kind === 'roster', m = f.map;
    const found = ROLES.filter(r => m[r.k] >= 0).map(r => r.label);
    const weak = !(m.userId >= 0 || m.email >= 0 || m.name >= 0 || m.video >= 0 || m.videoId >= 0 || m.time >= 0);
    const opts = (k: keyof typeof m) => `<option value="-1">（使わない）</option>` +
      f.headers.map((h, i) => `<option value="${i}"${m[k] === i ? ' selected' : ''}>${esc(h || `列 ${i + 1}`)}</option>`).join('');
    const status = weak ? '<b>列を自動で判別できませんでした。下の「列の対応」で指定してください。</b>'
      : (roster ? '受講者名簿として読み込みました。' : '') + '読み取った項目：' + esc(found.join('・')) + (f.saved ? '（保存した列の対応を使用）' : '');
    return `<div class="file"><div class="file-head"><b>${esc(f.name)}</b>
      <span class="file-meta">${roster ? '<span class="tag">名簿</span> ' : ''}${fmtInt(f.nRows)} ${roster ? '人' : '行'}　<button class="btn link" type="button" data-rm="${f.id}">取り除く</button></span></div>
      <div class="file-meta">${status}</div>
      <details${weak ? ' open' : ''}><summary>列の対応を直す</summary><div class="mapgrid">
      <label>ファイルの種類<select data-f="${f.id}" data-k="__kind">
        ${[['views', '視聴データ'], ['roster', '受講者名簿']].map(([v, l]) => `<option value="${v}"${f.kind === v ? ' selected' : ''}>${l}</option>`).join('')}</select></label>
      ${ROLES.map(r => `<label>${r.label}<select data-f="${f.id}" data-k="${r.k}">${opts(r.k)}</select></label>`).join('')}
      <label>視聴時間の単位<select data-f="${f.id}" data-k="__unit">
        ${[['min', '分'], ['sec', '秒'], ['hour', '時間']].map(([v, l]) => `<option value="${v}"${f.unit === v ? ' selected' : ''}>${l}</option>`).join('')}</select></label>
      </div>
      <p class="note">直した対応は、この端末のブラウザに保存され、同じ列構成のファイルに次回から自動で使われます。${f.saved ? ` <button class="btn link" type="button" data-forget="${f.id}">保存した対応を消す</button>` : ''}</p>
      </details></div>`;
  }).join('');
}

const hoursOrMin = (m: number): [string, string] => m >= 600 ? [fmt1(m / 60), '時間'] : [fmtInt(m), '分'];

export function renderKpis(a: AggCore) {
  const [tv, tu] = hoursOrMin(a.min);
  const period = a.tMin && a.tMax ? `${ymd(a.tMin)} 〜 ${ymd(a.tMax)}` : '日付の列なし';
  const per = a.nViewers ? hoursOrMin(a.min / a.nViewers) : null;
  const listed = [...a.users.values()].filter(u => u.inRoster), seen = listed.filter(u => u.pairs.size || u.views).length;
  const viewerSub = a.hasRoster ? `名簿 ${fmtInt(listed.length)} 人中 ${fmtInt(seen)} 人が視聴` : a.nViewers ? '' : '受講者の列なし';
  const tiles: [string, string, string, string][] = [
    ['視聴者', fmtInt(a.nViewers), '人', viewerSub],
    ['動画', fmtInt(a.videos.size), '本', ''],
    ['視聴回数', fmtInt(a.views), '回', period],
    ['総視聴時間', tv, tu, per ? `1 人あたり ${per[0]} ${per[1]}` : ''],
    ['平均完了率', a.comp == null ? '—' : fmt1(a.comp), a.comp == null ? '' : '%', a.comp == null ? '完了率・動画の長さの列なし' : '視聴した動画あたり'],
  ];
  $('kpis').innerHTML = tiles.map(([l, v, u, s]) =>
    `<div class="kpi"><div class="lab">${l}</div><div class="val">${v}<small>${u}</small></div><div class="sub">${esc(s) || '&nbsp;'}</div></div>`).join('');
}
