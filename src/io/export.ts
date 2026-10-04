import { byName, fmtDT, WD, wday, ymd } from '../util';
import type { Agg } from '../model/types';
import { missingByUser } from '../model/missing';
import type { Worksheet } from 'exceljs';

type Col = [header: string, width?: number, numFmt?: string];

export async function buildWorkbook(a: Agg, source: string, missTh = 0): Promise<ArrayBuffer> {
  const { default: ExcelJS } = await import('exceljs');
  const wb = new ExcelJS.Workbook(); wb.created = new Date();
  // ExcelJS writes Dates as UTC; shift so the sheet shows local wall-clock time
  const xDate = (d: Date | null) => d ? new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes(), d.getSeconds())) : null;
  const r1 = (v: number | null) => v == null ? null : Math.round(v * 10) / 10;
  const sheet = (name: string, cols: Col[], rows: unknown[][], freezeCol = 0) => {
    const ws = wb.addWorksheet(name, { views: [{ state: 'frozen', ySplit: 1, xSplit: freezeCol }] });
    ws.columns = cols.map(c => ({ header: c[0], width: c[1] || 14, style: c[2] ? { numFmt: c[2] } : {} }));
    rows.forEach(r => ws.addRow(r));
    const h = ws.getRow(1); h.font = { bold: true, color: { argb: 'FFFFFFFF' } }; h.alignment = { vertical: 'middle', wrapText: true };
    h.eachCell(c => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1C5CAB' } }; });
    if (rows.length) ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: cols.length } };
    return ws;
  };
  const scale = (ws: Worksheet, r0: number, c0: number, r1_: number, c1: number) => {
    if (r1_ < r0 || c1 < c0) return;
    ws.addConditionalFormatting({
      ref: `${ws.getCell(r0, c0).address}:${ws.getCell(r1_, c1).address}`,
      rules: [{ type: 'colorScale', priority: 1, cfvo: [{ type: 'min' }, { type: 'max' }], color: [{ argb: 'FFEAF2FD' }, { argb: 'FF3987E5' }] }],
    });
  };

  const ws0 = wb.addWorksheet('概要'); ws0.columns = [{ width: 22 }, { width: 48 }];
  [['Panopto 視聴集計'], ['作成日時', fmtDT(new Date())], ['対象', source],
   ['期間', a.tMin && a.tMax ? `${ymd(a.tMin)} 〜 ${ymd(a.tMax)}` : '（日付の列なし）'],
   ['視聴者数（人）', a.nViewers], ...(a.hasRoster ? [['名簿の人数（人）', [...a.users.values()].filter(u => u.inRoster).length]] : []), ['動画数（本）', a.videos.size], ['視聴回数（回）', a.views],
   ['総視聴時間（分）', r1(a.min)], ['総視聴時間（時間）', r1(a.min / 60)], ['平均完了率（%）', r1(a.comp) ?? '—'],
   [], ['完了率について', '完了率の列があればその最大値、なければ「視聴時間 ÷ 動画の長さ」（上限 100%）で求めています。'],
  ].forEach(r => ws0.addRow(r));
  ws0.getColumn(1).font = { bold: true }; ws0.getRow(1).font = { bold: true, size: 14 };
  ws0.getColumn(2).alignment = { horizontal: 'left', wrapText: true };

  const nv = a.videos.size, us = [...a.users.values()].sort((x, y) => y.min - x.min);
  const rosterCol = (u: { inRoster: boolean }) => a.hasRoster ? [u.inRoster ? '名簿' : '名簿外'] : [];
  sheet('受講者別', [['受講者', 24], ['ユーザー ID', 18], ['メール', 28], ...(a.hasRoster ? [['名簿', 8] as Col] : []), ['視聴回数', 10], ['視聴時間（分）', 14, '0.0'], ['視聴した動画数', 14], ['全動画数', 10], ['平均完了率（%）', 14, '0.0'], ['最終視聴日時', 18, 'yyyy-mm-dd hh:mm']],
    us.map(u => [u.name, u.id, u.email, ...rosterCol(u), u.views, r1(u.min), u.nVideos, nv, r1(u.comp), xDate(u.last)]), 1);
  sheet('動画別', [['動画', 44], ['フォルダー', 24], ['動画の長さ（分）', 14, '0.0'], ['視聴回数', 10], ['視聴者数', 10], ['視聴時間（分）', 14, '0.0'], ['1 人あたり視聴時間（分）', 16, '0.0'], ['平均完了率（%）', 14, '0.0']],
    a.vList.map(v => [v.name, v.folder, r1(v.dur), v.views, v.nUsers, r1(v.min), r1(v.per), r1(v.comp)]), 1);
  const days = [...a.days.values()].sort((x, y) => +x.date - +y.date);
  sheet('日別', [['日付', 12, 'yyyy-mm-dd'], ['曜日', 6], ['視聴回数', 10], ['視聴者数', 10], ['視聴時間（分）', 14, '0.0']],
    days.map(d => [xDate(d.date), WD[wday(d.date)], d.views, d.users.size, r1(d.min)]));
  if (a.hasClock) {
    const ws = sheet('曜日×時刻', [['曜日', 8], ...Array.from({ length: 24 }, (_, h): Col => [`${h}時`, 6])], a.heat.map((row, d) => [WD[d], ...row]), 1);
    ws.autoFilter = undefined; scale(ws, 2, 2, 8, 25);
  }
  const usN = [...a.users.values()].sort((x, y) => byName(x.name, y.name));
  if (usN.length && a.vList.length) {
    const mk = (name: string, fn: (p: { min: number; comp: number | null }) => number | null) => {
      const ws = sheet(name, [['受講者', 24], ['ユーザー ID', 18], ...a.vList.map((v): Col => [v.name, 12, '0.0'])],
        usN.map(u => [u.name, u.id || u.email, ...a.vList.map(v => { const p = u.pairs.get(v.key); return p ? fn(p) : null; })]), 2);
      ws.getRow(1).height = 48; scale(ws, 2, 3, usN.length + 1, a.vList.length + 2);
    };
    mk('受講者×動画（視聴分）', p => r1(p.min));
    if (a.anyComp) mk('受講者×動画（完了率）', p => r1(p.comp));
  }
  if (a.users.size && a.vList.length) {
    const th = a.anyComp ? missTh : 0;
    const ws = sheet('未視聴', [['受講者', 24], ['ユーザー ID', 18], ['メール', 28], ...(a.hasRoster ? [['名簿', 8] as Col] : []), ['未視聴の本数', 12], ['全動画数', 10], ['未視聴の動画', 80]],
      missingByUser(a, th).sort((x, y) => y.videos.length - x.videos.length || byName(x.user.name, y.user.name))
        .map(m => [m.user.name, m.user.id, m.user.email, ...rosterCol(m.user), m.videos.length, a.vList.length, m.videos.map(v => v.name).join('、')]), 1);
    ws.getColumn(ws.columnCount).alignment = { wrapText: true, vertical: 'top' };
    ws0.addRow(['未視聴について', th ? `記録がないか完了率 ${th}% 未満の動画を未視聴としています。` : '視聴の記録がない動画を未視聴としています。']);
  }
  sheet('明細', [['視聴日時', 18, 'yyyy-mm-dd hh:mm'], ['受講者', 22], ['ユーザー ID', 18], ['メール', 26], ['動画', 40], ['フォルダー', 22], ['視聴回数', 10], ['視聴時間（分）', 14, '0.00'], ['完了率（%）', 12, '0.0']],
    a.recs.map(r => [xDate(r.t), r.uName, r.uId, r.email, r.vName, r.folder, r.views, Math.round(r.min * 100) / 100, r1(r.pct)]));
  return wb.xlsx.writeBuffer() as Promise<ArrayBuffer>;
}

export function download(buf: ArrayBuffer, name: string) {
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 60000);
}
