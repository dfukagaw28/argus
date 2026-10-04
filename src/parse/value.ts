import type { Unit } from '../schema/roles';
import { fmtDT } from '../util';

export type Cell = string | number | Date | boolean | null | undefined;

export function parseNum(v: Cell): number | null {
  if (v == null || v === '') return null;
  if (typeof v === 'number') return isFinite(v) ? v : null;
  if (v instanceof Date || typeof v === 'boolean') return null;
  const s = String(v).replace(/[,\s%％]/g, '');
  if (s === '') return null;
  const n = Number(s);
  return isFinite(n) ? n : (isFinite(parseFloat(s)) ? parseFloat(s) : null);
}

/** Returns minutes; "h:mm:ss" / "m:ss" strings are read as a clock duration. */
export function parseDur(v: Cell, unit: Unit): number | null {
  if (v == null || v === '') return null;
  if (typeof v === 'string' && /^\s*\d+:\d{1,2}(:\d{1,2}(\.\d+)?)?\s*$/.test(v)) {
    const p = v.trim().split(':').map(Number);
    return p.length === 3 ? p[0] * 60 + p[1] + p[2] / 60 : p[0] + p[1] / 60;
  }
  if (v instanceof Date) return v.getUTCHours() * 60 + v.getUTCMinutes() + v.getUTCSeconds() / 60;
  const n = parseNum(v); if (n == null) return null;
  return unit === 'sec' ? n / 60 : unit === 'hour' ? n * 60 : n;
}

export function parseDate(v: Cell): Date | null {
  if (v == null || v === '') return null;
  if (v instanceof Date) {
    if (isNaN(+v)) return null; // ExcelJS: wall-clock stored as UTC
    return new Date(v.getUTCFullYear(), v.getUTCMonth(), v.getUTCDate(), v.getUTCHours(), v.getUTCMinutes(), v.getUTCSeconds());
  }
  if (typeof v === 'number') {
    // Excel serial date
    if (v > 20000 && v < 90000) return parseDate(new Date(Math.round((v - 25569) * 86400000)));
    return null;
  }
  let s = String(v).trim(); if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}T.*(Z|[+-]\d{2}:?\d{2})$/.test(s)) { const d = new Date(s); return isNaN(+d) ? null : d; }
  const pm = /PM|午後/i.test(s), am = /AM|午前/i.test(s);
  s = s.replace(/午前|午後|AM|PM/gi, ' ').replace(/\s+/g, ' ').trim();
  const fix = (h: number) => pm && h < 12 ? h + 12 : am && h === 12 ? 0 : h;
  let m = s.match(/^(\d{4})[-/.年](\d{1,2})[-/.月](\d{1,2})日?(?:[T ,]+(\d{1,2})[:時](\d{1,2})(?:[:分](\d{1,2}))?)?/);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3], fix(+(m[4] || 0)), +(m[5] || 0), +(m[6] || 0));
  m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})(?:[ ,]+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
  if (m) {
    let mo = +m[1], da = +m[2];
    if (mo > 12) [mo, da] = [da, mo];
    return new Date(+m[3], mo - 1, da, fix(+(m[4] || 0)), +(m[5] || 0), +(m[6] || 0));
  }
  const d = new Date(s); return isNaN(+d) ? null : d;
}

export const str = (v: Cell) => v == null ? '' : (v instanceof Date ? fmtDT(parseDate(v)) : String(v).trim());
