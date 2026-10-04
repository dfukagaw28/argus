import { $, byName, esc, fmt1, fmtDT, fmtInt } from '../util';
import { state } from '../state';
import { cellStyle } from './charts';

const LIMIT = 500;
const seek = (c: number | null) => c == null ? '—' : `<div class="seek"><i><b style="width:${Math.max(0, Math.min(100, c))}%"></b></i><span>${fmt1(c)}%</span></div>`;
const mbar = (v: number, max: number) => `<div class="mbar"><i style="width:${max ? Math.round(v / max * 80) : 0}px"></i><span>${fmt1(v)}</span></div>`;

function sorted<T>(list: T[], tab: 'videos' | 'users'): T[] {
  const [k, dir] = state.sort[tab];
  return list.slice().sort((a, b) => {
    const x = (a as Record<string, unknown>)[k], y = (b as Record<string, unknown>)[k];
    if (x == null && y == null) return 0; if (x == null) return 1; if (y == null) return -1;
    return (typeof x === 'string' ? byName(x, y as string) : (x as number) - (y as number)) * dir;
  });
}
function th(tab: 'videos' | 'users', k: string, label: string, num = false) {
  const [sk, dir] = state.sort[tab];
  return `<th class="${num ? 'n' : ''}"${sk === k ? ` aria-sort="${dir > 0 ? 'ascending' : 'descending'}"` : ''}><button type="button" data-sort="${k}">${label}${sk === k ? (dir > 0 ? ' ▲' : ' ▼') : ''}</button></th>`;
}

export function renderTable() {
  const a = state.agg, q = state.q.trim().toLowerCase(), box = $('table');
  $('seg-mx').hidden = state.tab !== 'matrix' || !a.anyComp;
  const more = (n: number, what: string) => n > LIMIT ? `<p class="note">画面には上位 ${LIMIT} 件を表示しています。残り ${fmtInt(n - LIMIT)} ${what}は Excel に含まれます。</p>` : '';
  const userHit = (u: { name: string; id: string; email: string }) => !q || (u.name + ' ' + u.id + ' ' + u.email).toLowerCase().includes(q);

  if (state.tab === 'videos') {
    const list = sorted([...a.videos.values()].filter(v => !q || (v.name + ' ' + v.folder).toLowerCase().includes(q)), 'videos');
    if (!list.length) { box.innerHTML = '<div class="empty">動画の情報がありません。</div>'; return; }
    const max = Math.max(...list.map(v => v.min)), hasF = list.some(v => v.folder);
    box.innerHTML = `<div class="scroll"><table><thead><tr>${th('videos', 'name', '動画')}${th('videos', 'views', '視聴回数', true)}${th('videos', 'nUsers', '視聴者数', true)}${th('videos', 'min', '視聴時間（分）', true)}${th('videos', 'per', '1 人あたり（分）', true)}${th('videos', 'comp', '平均完了率', true)}</tr></thead><tbody>` +
      list.slice(0, LIMIT).map(v => `<tr><td class="t">${esc(v.name)}${hasF && v.folder ? `<div class="sub">${esc(v.folder)}</div>` : ''}</td><td class="n">${fmtInt(v.views)}</td><td class="n">${fmtInt(v.nUsers)}</td><td class="n">${mbar(v.min, max)}</td><td class="n">${v.per == null ? '—' : fmt1(v.per)}</td><td class="n">${seek(v.comp)}</td></tr>`).join('') +
      `</tbody></table></div>${more(list.length, '本')}`;
  } else if (state.tab === 'users') {
    const list = sorted([...a.users.values()].filter(userHit), 'users');
    if (!list.length) { box.innerHTML = '<div class="empty">受講者の列が見つからないため、受講者別の集計はありません。</div>'; return; }
    const max = Math.max(...list.map(u => u.min)), nv = a.videos.size;
    box.innerHTML = `<div class="scroll"><table><thead><tr>${th('users', 'name', '受講者')}${th('users', 'views', '視聴回数', true)}${th('users', 'min', '視聴時間（分）', true)}${th('users', 'nVideos', '視聴した動画', true)}${th('users', 'comp', '平均完了率', true)}${th('users', 'last', '最終視聴')}</tr></thead><tbody>` +
      list.slice(0, LIMIT).map(u => {
        const sub = [u.id, u.email].filter(x => x && x !== u.name).join(' ・ ');
        return `<tr><td class="t">${esc(u.name)}${sub ? `<div class="sub">${esc(sub)}</div>` : ''}</td><td class="n">${fmtInt(u.views)}</td><td class="n">${mbar(u.min, max)}</td><td class="n">${u.nVideos} / ${nv} 本</td><td class="n">${seek(u.comp)}</td><td>${fmtDT(u.last) || '—'}</td></tr>`;
      }).join('') + `</tbody></table></div>${more(list.length, '人')}`;
  } else {
    const us = [...a.users.values()].filter(userHit).sort((x, y) => byName(x.name, y.name)), vs = a.vList;
    if (!us.length || !vs.length) { box.innerHTML = '<div class="empty">受講者と動画の両方の列がある場合に表示されます。</div>'; return; }
    const mode = a.anyComp ? state.mx : 'min', VL = 60, UL = 300;
    let mxMin = 1;
    if (mode === 'min') for (const u of us) for (const p of u.pairs.values()) if (p.min > mxMin) mxMin = p.min;
    box.innerHTML = `<div class="scroll mx"><table><thead><tr><th>受講者</th>${vs.slice(0, VL).map(v => `<th class="v" data-tip="${esc(v.name)}|">${esc(v.name)}</th>`).join('')}</tr></thead><tbody>` +
      us.slice(0, UL).map(u => `<tr><td data-tip="${esc(u.name)}|${esc(u.email || u.id || '')}">${esc(u.name)}</td>` + vs.slice(0, VL).map(v => {
        const p = u.pairs.get(v.key);
        if (!p) return `<td class="c z" data-tip="${esc(u.name)}|${esc(v.name)}：未視聴">·</td>`;
        const val = mode === 'comp' ? p.comp : p.min, pc = val == null ? 0 : mode === 'comp' ? val : val / mxMin * 100;
        return `<td class="c" style="${cellStyle(pc)}" data-tip="${esc(u.name)}|${esc(v.name)}：${fmt1(p.min)} 分${p.comp != null ? `・完了率 ${fmt1(p.comp)}%` : ''}">${val == null ? '○' : Math.round(val)}</td>`;
      }).join('') + '</tr>').join('') +
      `</tbody></table></div><p class="note">${mode === 'comp' ? '数字は完了率（%）' : '数字は視聴時間（分）'}。「·」は未視聴。${us.length > UL || vs.length > VL ? `画面には ${Math.min(us.length, UL)} 人 × ${Math.min(vs.length, VL)} 本まで表示し、全件は Excel に含まれます。` : ''}</p>`;
  }
}
