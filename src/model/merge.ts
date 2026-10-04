import { normalise, rosterOf } from './normalise';
import type { Person, Rec, SourceFile } from './types';

export interface Merged { recs: Rec[]; roster: Person[]; dupes: number }

const recKey = (r: Rec) => [r.t ? +r.t : '', r.uKey, r.vKey, r.min, r.views, r.pct ?? ''].join('\u0001');

/**
 * Combines all files. A record that also appears in an earlier file (e.g. two exports with
 * overlapping periods) is dropped; repeated rows inside one file are kept as they are.
 */
export function mergeFiles(files: SourceFile[]): Merged {
  const seen = new Map<string, string>(), recs: Rec[] = [], people = new Map<string, Person>();
  let dupes = 0;
  for (const f of files) {
    if (f.kind === 'roster') {
      for (const p of rosterOf(f)) if (!people.has(p.uKey)) people.set(p.uKey, p);
      continue;
    }
    for (const r of normalise(f)) {
      const k = recKey(r), owner = seen.get(k);
      if (owner !== undefined && owner !== f.id) { dupes++; continue; }
      seen.set(k, f.id); recs.push(r);
    }
  }
  return { recs, roster: [...people.values()], dupes };
}

export const folders = (recs: Rec[]) => [...new Set(recs.map(r => r.folder).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ja', { numeric: true }));
