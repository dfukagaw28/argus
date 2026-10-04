import './style.css';
import { $, esc, ymd } from './util';
import { state } from './state';
import { connectEngine } from './engine/client';
import type { FilePatch } from './engine/engine';
import { download } from './io/download';
import { forget, loadSaved, save } from './io/prefs';
import { renderHeat, renderSeries } from './ui/charts';
import { renderTable } from './ui/tables';
import { renderFiles, renderKpis } from './ui/panels';
import { initTips, toast } from './ui/tip';
import { busy } from './ui/busy';
import { initFileHandler, initPwa } from './pwa';
import type { RoleKey, Unit } from './schema/roles';
import type { FileKind } from './model/types';

const engine = connectEngine();

const inputDate = (id: string) => {
  const v = $<HTMLInputElement>(id).value; if (!v) return null;
  const [y, m, d] = v.split('-').map(Number); return new Date(y, m - 1, d);
};
const query = () => ({ from: inputDate('f-from'), to: inputDate('f-to'), folder: state.folder });

/** Re-aggregates in the worker and redraws. Only the latest request's answer is drawn. */
let refreshSeq = 0;
async function refresh() {
  const my = ++refreshSeq;
  const v = await busy(engine.query(query()));
  if (my !== refreshSeq) return;
  Object.assign(state, { agg: v.agg, files: v.files, folders: v.folders, folder: v.folder, dupes: v.dupes, sample: v.sample });
  render();
}
function render() {
  const a = state.agg;
  $('sample-note').hidden = !state.sample;
  renderFolders(); renderFiles(); renderKpis(a); renderSeries(); renderHeat(a); renderTable();
}
/** One line stating what the printout covers, since the filter controls are hidden on paper. */
function renderPrintScope() {
  const a = state.agg, from = $<HTMLInputElement>('f-from').value, to = $<HTMLInputElement>('f-to').value;
  const period = from || to ? `${from || '最初'} 〜 ${to || '最後'}` : a.tMin && a.tMax ? `${ymd(a.tMin)} 〜 ${ymd(a.tMax)}（全期間）` : '全期間';
  const src = state.sample ? 'サンプルデータ（架空）' : state.files.map(f => f.name).join('、');
  $('print-scope').textContent = [`対象：${src}`, `期間：${period}`, state.folder && `フォルダー：${state.folder}`, state.q.trim() && `名前の絞り込み：${state.q.trim()}`].filter(Boolean).join('　／　');
}
function renderFolders() {
  const fs = state.folders, sel = $<HTMLSelectElement>('f-folder');
  $('f-folder-wrap').hidden = fs.length < 2;
  sel.innerHTML = `<option value="">すべて</option>` + fs.map(f => `<option${f === state.folder ? ' selected' : ''}>${esc(f)}</option>`).join('');
  sel.value = state.folder;
}
function resetPeriod() { $<HTMLInputElement>('f-from').value = $<HTMLInputElement>('f-to').value = ''; }

async function addFiles(list: File[]) {
  if (!list.length) return;
  const wasSample = state.sample;
  try {
    const errs = await busy(engine.addFiles(list, loadSaved()), '読み込み中…');
    $('errors').innerHTML = errs.map(e => `<div class="notice">${esc(e)}</div>`).join('');
  } catch (e) { $('errors').innerHTML = `<div class="notice">${esc('読み込みに失敗しました：' + ((e as Error)?.message || e))}</div>`; }
  if (wasSample) resetPeriod();
  await refresh();
}

async function updateFile(id: string, patch: FilePatch) {
  await engine.updateFile(id, patch);
  const f = state.files.find(x => x.id === id);
  if (f) save({ headers: f.headers, map: { ...f.map, ...patch.map }, unit: patch.unit ?? f.unit, kind: patch.kind ?? f.kind });
  await refresh();
}

async function exportExcel() {
  const btn = $<HTMLButtonElement>('btn-export'); btn.disabled = true;
  try {
    download(await busy(engine.exportXlsx(query(), state.missTh), 'Excel を作成中…'), `Panopto視聴集計_${ymd(new Date()).replace(/-/g, '')}.xlsx`);
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

$('files').addEventListener('click', async e => {
  const { rm, forget: fid } = (e.target as HTMLElement).dataset ?? {};
  if (fid) {
    const f = state.files.find(x => x.id === fid); if (!f) return;
    forget(f); f.saved = false; await engine.setSaved(fid, false); renderFiles();
    toast('保存した列の対応を消しました。次回からは自動判別に戻ります。');
    return;
  }
  if (!rm) return;
  await engine.removeFile(rm);
  await refresh();
});
$('files').addEventListener('change', async e => {
  const el = e.target as HTMLSelectElement, { f: id, k } = el.dataset;
  if (!id || !k) return;
  const open = [...document.querySelectorAll<HTMLDetailsElement>('.file details')].map(d => d.open);
  await updateFile(id, k === '__unit' ? { unit: el.value as Unit } : k === '__kind' ? { kind: el.value as FileKind } : { map: { [k as RoleKey]: +el.value } });
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
$<HTMLSelectElement>('f-folder').onchange = e => { state.folder = (e.target as HTMLSelectElement).value; refresh(); };
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
$('f-from').onchange = $('f-to').onchange = refresh;
$('f-reset').onclick = () => { resetPeriod(); refresh(); };
$('btn-export').onclick = exportExcel;
let rT: ReturnType<typeof setTimeout>;
addEventListener('resize', () => { clearTimeout(rT); rT = setTimeout(renderSeries, 120); });

initTips();
initPwa();
initFileHandler(addFiles);
refresh();
