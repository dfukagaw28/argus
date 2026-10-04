import { $, byName, esc, fmt1, fmtDT, fmtInt } from '../util';
import { state } from '../state';
import { cellStyle } from './charts';
import { missingByUser, missingByVideo } from '../model/missing';

const LIMIT = 500;
const seek = (c: number | null) => c == null ? '—' : `<div class="seek"><i><b style="width:${Math.max(0, Math.min(100, c))}%"></b></i><span>${fmt1(c)}%</span></div>`;
const mbar = (v: number, max: number) => `<div class="mbar"><i style="width:${max ? Math.round(v / max * 80) : 0}px"></i><span>${fmt1(v)}</span></div>`;

function sorted<T>(list: T[], tab: 'videos' | 'users' | 'missing'): T[] {
  const [k, dir] = state.sort[tab];
  return list.slice().sort((a, b) => {
    const x = (a as Record<string, unknown>)[k], y = (b as Record<string, unknown>)[k];
    if (x == null && y == null) return 0; if (x == null) return 1; if (y == null) return -1;
    return (typeof x === 'string' ? byName(x, y as string) : (x as number) - (y as number)) * dir;
  });
}
function th(tab: 'videos' | 'users' | 'missing', k: string, label: string, num = false) {
  const [sk, dir] = state.sort[tab];
  return `<th class="${num ? 'n' : ''}"${sk === k ? ` aria-sort="${dir > 0 ? 'ascending' : 'descending'}"` : ''}><button type="button" data-sort="${k}">${label}${sk === k ? (dir > 0 ? ' ▲' : ' ▼') : ''}</button></th>`;
}

export function renderTable() {
  const a = state.agg, q = state.q.trim().toLowerCase(), box = $('table');
  $('seg-mx').hidden = state.tab !== 'matrix' || !a.anyComp;
  $('miss-opts').hidden = state.tab !== 'missing';
  $('miss-th-wrap').hidden = !a.anyComp;
  const outside = (u: { inRoster: boolean }) => a.hasRoster && !u.inRoster ? ' <span class="tag">名簿外</span>' : '';
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
        return `<tr><td class="t">${esc(u.name)}${outside(u)}${sub ? `<div class="sub">${esc(sub)}</div>` : ''}</td><td class="n">${fmtInt(u.views)}</td><td class="n">${mbar(u.min, max)}</td><td class="n">${u.nVideos} / ${nv} 本</td><td class="n">${seek(u.comp)}</td><td>${fmtDT(u.last) || '—'}</td></tr>`;
      }).join('') + `</tbody></table></div>${more(list.length, '人')}`;
  } else if (state.tab === 'missing') {
    box.innerHTML = renderMissing(userHit);
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

function renderMissing(userHit: (u: { name: string; id: string; email: string }) => boolean): string {
  const a = state.agg, th = a.anyComp ? state.missTh : 0, nv = a.vList.length;
  if (!a.users.size || !nv) return '<div class="empty">受講者と動画の両方の列がある場合に表示されます。</div>';
  const what = th ? `記録がないか完了率 ${th}% 未満の` : '視聴の記録がない';
  const scope = a.hasRoster ? '名簿と視聴データに含まれる受講者' : '視聴データに含まれる受講者（一度も視聴していない人は含まれません。名簿を読み込むと含まれます）';
  const note = `<p class="note">${what}ものを未視聴としています。対象は${scope}です。</p>`;
  const names = (xs: { name: string }[]) => esc(xs.map(x => x.name).join('、'));
  if (state.missBy === 'video') {
    const rows = missingByVideo(a, th).map(m => ({ ...m, users: m.users.filter(userHit) }));
    const total = a.users.size;
    return `<div class="scroll"><table><thead><tr><th>動画</th><th class="n">未視聴</th><th>未視聴の受講者</th></tr></thead><tbody>` +
      rows.map(m => `<tr><td class="t">${esc(m.video.name)}</td><td class="n">${fmtInt(m.users.length)} / ${fmtInt(total)} 人</td><td class="t wide">${m.users.length ? names(m.users) : '<span class="ok">全員視聴</span>'}</td></tr>`).join('') +
      `</tbody></table></div>${note}`;
  }
  const list = sorted(missingByUser(a, th).filter(m => userHit(m.user))
    .map(m => ({ ...m, name: m.user.name, nMissing: m.videos.length, last: m.user.last })), 'missing');
  if (!list.length) return `<div class="empty">未視聴の受講者はいません。</div>${note}`;
  return `<div class="scroll"><table><thead><tr>${th_('name', '受講者')}${th_('nMissing', '未視聴', true)}${th_('last', '最終視聴')}<th>未視聴の動画</th></tr></thead><tbody>` +
    list.slice(0, LIMIT).map(m => {
      const u = m.user, sub = [u.id, u.email].filter(x => x && x !== u.name).join(' ・ ');
      const tag = a.hasRoster && !u.inRoster ? ' <span class="tag">名簿外</span>' : !u.pairs.size ? ' <span class="tag warn">視聴なし</span>' : '';
      return `<tr><td class="t">${esc(u.name)}${tag}${sub ? `<div class="sub">${esc(sub)}</div>` : ''}</td><td class="n">${m.nMissing} / ${nv} 本</td><td>${fmtDT(u.last) || '—'}</td><td class="t wide">${names(m.videos)}</td></tr>`;
    }).join('') + `</tbody></table></div>${list.length > LIMIT ? `<p class="note">画面には ${LIMIT} 人まで表示しています。全員分は Excel に含まれます。</p>` : ''}${note}`;
}
const th_ = (k: string, label: string, num = false) => th('missing', k, label, num);
