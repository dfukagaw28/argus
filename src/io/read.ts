import Papa from 'papaparse';
import { detectMap, detectUnit } from '../schema/detect';
import { detectKind } from '../schema/kind';
import { str, type Cell } from '../parse/value';
import type { SourceFile } from '../model/types';

export interface RawTable { name: string; rows: Cell[][] }

export function decodeText(buf: ArrayBuffer): string {
  const u = new Uint8Array(buf);
  if (u[0] === 0xFF && u[1] === 0xFE) return new TextDecoder('utf-16le').decode(buf);
  if (u[0] === 0xFE && u[1] === 0xFF) return new TextDecoder('utf-16be').decode(buf);
  try { return new TextDecoder('utf-8', { fatal: true }).decode(buf); }
  catch { return new TextDecoder('shift_jis').decode(buf); }
}

function cellVal(v: unknown): Cell {
  if (v == null) return '';
  if (typeof v !== 'object' || v instanceof Date) return v as Cell;
  const o = v as Record<string, unknown>;
  if (Array.isArray(o.richText)) return (o.richText as { text: string }[]).map(t => t.text).join('');
  if ('result' in o) return cellVal(o.result);
  if ('text' in o) return cellVal(o.text);
  if ('error' in o) return '';
  return String(v);
}

export function parseCsv(text: string): Cell[][] {
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
  return Papa.parse<Cell[]>(text, { skipEmptyLines: 'greedy' }).data;
}

export async function readTables(file: File): Promise<RawTable[]> {
  const buf = await file.arrayBuffer();
  const ext = (file.name.match(/\.([^.]+)$/) || [, ''])[1]!.toLowerCase();
  const u = new Uint8Array(buf.slice(0, 4));
  if (ext === 'xls' || (u[0] === 0xD0 && u[1] === 0xCF))
    throw new Error('古い形式の Excel（.xls）は読めません。Excel で開いて .xlsx か CSV で保存し直してください。');
  if (u[0] === 0x50 && u[1] === 0x4B) {
    const { default: ExcelJS } = await import('exceljs');
    const wb = new ExcelJS.Workbook(); await wb.xlsx.load(buf);
    const out: RawTable[] = [];
    wb.eachSheet(ws => {
      const rows: Cell[][] = [];
      ws.eachRow({ includeEmpty: false }, row => {
        const a: Cell[] = [];
        row.eachCell({ includeEmpty: true }, (c, i) => { a[i - 1] = cellVal(c.value); });
        for (let i = 0; i < a.length; i++) if (a[i] === undefined) a[i] = '';
        rows.push(a);
      });
      if (rows.length > 1) out.push({ name: wb.worksheets.length > 1 ? `${file.name} › ${ws.name}` : file.name, rows });
    });
    return out;
  }
  return [{ name: file.name, rows: parseCsv(decodeText(buf)) }];
}

let seq = 0;
/** Finds the header row (first row with ≥2 non-empty cells) and auto-detects the column map. */
export function toSourceFile(name: string, rows: Cell[][]): SourceFile {
  const hi = rows.findIndex(r => r.filter(c => str(c) !== '').length >= 2);
  if (hi < 0) throw new Error('表として読める行が見つかりませんでした。');
  const headers = rows[hi].map(str), body = rows.slice(hi + 1).filter(r => r.some(c => str(c) !== ''));
  if (!body.length) throw new Error('見出し行の下にデータがありません。');
  const map = detectMap(headers);
  return { id: 'f' + (++seq), name, headers, rows: body, map, unit: detectUnit(headers, map), kind: detectKind(map) };
}
