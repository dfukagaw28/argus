import './style.css';
import { $, esc, ymd } from './util';
import { state } from './state';
import { readTables, toSourceFile } from './io/read';
import { folders, mergeFiles } from './model/merge';
import { applySaved, forget, save } from './io/prefs';
import { aggregate } from './model/aggregate';
import { sampleRecords } from './model/sample';
import { renderHeat, renderSeries } from './ui/charts';
import { renderTable } from './ui/tables';
import { renderFiles, renderKpis } from './ui/panels';
import { initTips, toast } from './ui/tip';
import type { RoleKey, Unit } from './schema/roles';
import type { FileKind } from './model/types';

const inputDate = (id: string) => {
  const v = $<HTMLInputElement>(id).value; if (!v) return null;
  const [y, m, d] = v.split('-').map(Number); return new Date(y, m - 1, d);
};

function render() {
  const a = state.agg = aggregate(state.recs, { from: inputDate('f-from'), to: inputDate('f-to'), folder: state.folder, roster: state.roster });
  $('sample-note').hidden = !state.sample;
  renderFiles(); renderKpis(a); renderSeries(); renderHeat(a); renderTable();
  renderPrintScope();
}
/** One line stating what the printout covers, since the filter controls are hidden on paper. */
function renderPrintScope() {
  const a = state.agg, from = $<HTMLInputElement>('f-from').value, to = $<HTMLInputElement>('f-to').value;
  const period = from || to ? `${from || '最初'} 〜 ${to || '最後'}` : a.tMin && a.tMax ? `${ymd(a.tMin)} 〜 ${ymd(a.tMax)}（全期間）` : '全期間';
  const src = state.sample ? 'サンプルデータ（架空）' : state.files.map(f => f.name).join('、');
  $('print-scope').textContent = [`対象：${src}`, `期間：${period}`, state.folder && `フォルダー：${state.folder}`, state.q.trim() && `名前の絞り込み：${state.q.trim()}`].filter(Boolean).join('　／　');
}
function rebuild() {
  if (state.sample) Object.assign(state, { recs: sampleRecords(), roster: [], dupes: 0 });
  else Object.assign(state, mergeFiles(state.files));
  renderFolders();
  render();
}
function renderFolders() {
  const fs = folders(state.recs), sel = $<HTMLSelectElement>('f-folder');
  if (!fs.includes(state.folder)) state.folder = '';
  $('f-folder-wrap').hidden = fs.length < 2;
  sel.innerHTML = `<option value="">すべて</option>` + fs.map(f => `<option${f === state.folder ? ' selected' : ''}>${esc(f)}</option>`).join('');
  sel.value = state.folder;
}
function resetPeriod() { $<HTMLInputElement>('f-from').value = $<HTMLInputElement>('f-to').value = ''; }

async function addFiles(list: File[]) {
  const errs: string[] = [];
  for (const file of list) {
    try {
      const tables = await readTables(file);
      if (!tables.length) throw new Error('データのあるシートが見つかりませんでした。');
      for (const t of tables) {
        const f = toSourceFile(t.name, t.rows);
        f.saved = applySaved(f);
        state.files = state.files.filter(x => x.name !== f.name); state.files.push(f);
      }
    } catch (e) { errs.push(`${file.name}：${(e as Error)?.message || '読み込めませんでした。'}`); }
  }
  $('errors').innerHTML = errs.map(e => `<div class="notice">${esc(e)}</div>`).join('');
  if (state.files.length) { state.sample = false; resetPeriod(); }
  rebuild();
}

async function exportExcel() {
  const btn = $<HTMLButtonElement>('btn-export'); btn.disabled = true;
  try {
    const { buildWorkbook, download } = await import('./io/export');
    const source = state.sample ? 'サンプルデータ（架空）' : state.files.map(f => f.name).join('、') + (state.folder ? `（フォルダー：${state.folder}）` : '');
    download(await buildWorkbook(state.agg, source, state.missTh), `Panopto視聴集計_${ymd(new Date()).replace(/-/g, '')}.xlsx`);
    toast('Excel ファイルを書き出しました。');
  } catch (e) { toast('Excel の作成に失敗しました：' + ((e as Error)?.message || e)); }
  btn.disabled = false;
}

/* ---------- events ---------- */
const drop = $('drop'); let dragN = 0;
addEventListener('dragenter', e => { e.preventDefault(); dragN++; drop.classList.add('over'); });
addEventListener('dragover', e => e.preventDefault());
addEventListener('dragleave', () => { if (--dragN <= 0) { dragN = 0; drop.classList.remove('over'); } });
addEventListener('drop', e => {
  e.preventDefault(); dragN = 0; drop.classList.remove('over');
  if (e.dataTransfer?.files?.length) addFiles([...e.dataTransfer.files]);
});
const fileInput = $<HTMLInputElement>('file-input');
$('btn-pick').onclick = () => fileInput.click();
fileInput.onchange = () => { addFiles([...(fileInput.files ?? [])]); fileInput.value = ''; };

$('files').addEventListener('click', e => {
  const { rm, forget: fid } = (e.target as HTMLElement).dataset ?? {};
  if (fid) {
    const f = state.files.find(x => x.id === fid); if (!f) return;
    forget(f); f.saved = false; renderFiles(); toast('保存した列の対応を消しました。次回からは自動判別に戻ります。');
    return;
  }
  if (!rm) return;
  state.files = state.files.filter(f => f.id !== rm);
  if (!state.files.length) state.sample = true;
  rebuild();
});
$('files').addEventListener('change', e => {
  const el = e.target as HTMLSelectElement, { f: id, k } = el.dataset;
  const f = state.files.find(x => x.id === id); if (!f || !k) return;
  const open = [...document.querySelectorAll<HTMLDetailsElement>('.file details')].map(d => d.open);
  if (k === '__unit') f.unit = el.value as Unit;
  else if (k === '__kind') f.kind = el.value as FileKind;
  else f.map[k as RoleKey] = +el.value;
  save(f); f.saved = true;
  rebuild();
  document.querySelectorAll<HTMLDetailsElement>('.file details').forEach((d, i) => { d.open = open[i]; });
});

function seg<K extends 'metric' | 'gran' | 'mx' | 'missBy'>(id: string, key: K, after: () => void) {
  $(id).addEventListener('click', e => {
    const b = (e.target as Element).closest('button'); if (!b) return;
    (state[key] as string) = b.dataset.v!;
    $(id).querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    after();
  });
}
seg('seg-metric', 'metric', renderSeries); seg('seg-gran', 'gran', renderSeries); seg('seg-mx', 'mx', renderTable); seg('seg-miss', 'missBy', renderTable);
$<HTMLSelectElement>('miss-th').onchange = e => { state.missTh = +(e.target as HTMLSelectElement).value; renderTable(); };
$<HTMLSelectElement>('f-folder').onchange = e => { state.folder = (e.target as HTMLSelectElement).value; render(); };
$('btn-print').onclick = () => print();
addEventListener('beforeprint', renderPrintScope);

document.querySelector('.tabs')!.addEventListener('click', e => {
  const b = (e.target as Element).closest('button'); if (!b) return;
  state.tab = b.dataset.tab as typeof state.tab;
  document.querySelectorAll('.tabs button').forEach(x => x.setAttribute('aria-selected', String(x === b)));
  renderTable();
});
$('table').addEventListener('click', e => {
  const k = (e.target as HTMLElement).dataset?.sort; if (!k || state.tab === 'matrix') return;
  const s = state.sort[state.tab];
  state.sort[state.tab] = s[0] === k ? [k, s[1] > 0 ? -1 : 1] : [k, k === 'name' ? 1 : -1];
  renderTable();
});
$<HTMLInputElement>('q').oninput = e => { state.q = (e.target as HTMLInputElement).value; renderTable(); };
$('f-from').onchange = $('f-to').onchange = render;
$('f-reset').onclick = () => { resetPeriod(); render(); };
$('btn-export').onclick = exportExcel;
let rT: ReturnType<typeof setTimeout>;
addEventListener('resize', () => { clearTimeout(rT); rT = setTimeout(renderSeries, 120); });

initTips();
rebuild();
