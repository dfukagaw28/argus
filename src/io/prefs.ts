import { normHead } from '../schema/detect';
import type { ColumnMap, Unit } from '../schema/roles';
import type { FileKind, SourceFile } from '../model/types';

/** Remembers manual column fixes per header layout, so the next report of the same shape needs none. */
const KEY = 'argus.columns.v1';
interface Saved { map: ColumnMap; unit: Unit; kind: FileKind }

const signature = (headers: string[]) => headers.map(normHead).join('|');

function readAll(): Record<string, Saved> {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch { return {}; }
}

/** Applies a saved layout if one matches; returns whether it did. */
export function applySaved(f: SourceFile): boolean {
  const s = readAll()[signature(f.headers)];
  if (!s || !s.map) return false;
  // ignore columns that no longer exist
  for (const k of Object.keys(f.map) as (keyof ColumnMap)[]) {
    const i = s.map[k];
    if (typeof i === 'number' && i < f.headers.length) f.map[k] = i;
  }
  if (s.unit) f.unit = s.unit;
  if (s.kind) f.kind = s.kind;
  return true;
}

export function save(f: SourceFile) {
  try {
    const all = readAll();
    all[signature(f.headers)] = { map: f.map, unit: f.unit, kind: f.kind };
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch { /* storage unavailable: fixes just aren't remembered */ }
}

export function forget(f: SourceFile) {
  try { const all = readAll(); delete all[signature(f.headers)]; localStorage.setItem(KEY, JSON.stringify(all)); } catch { /* ignore */ }
}
