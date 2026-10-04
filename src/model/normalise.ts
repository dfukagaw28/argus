import { parseDate, parseDur, parseNum, str } from '../parse/value';
import type { RoleKey } from '../schema/roles';
import type { Person, Rec, SourceFile } from './types';

type Row = SourceFile['rows'][number];
const getter = (f: SourceFile) => (r: Row, k: RoleKey) => f.map[k] >= 0 ? r[f.map[k]] : null;

/** Same identity rule as viewing records: user ID, else email, else name. */
function person(f: SourceFile, r: Row): Person {
  const g = getter(f), uid = str(g(r, 'userId')), em = str(g(r, 'email')), nm = str(g(r, 'name'));
  return { uKey: (uid || em || nm).toLowerCase(), uName: nm || uid || em, uId: uid, email: em };
}

export function rosterOf(f: SourceFile): Person[] {
  return f.rows.map(r => person(f, r)).filter(p => p.uKey);
}

export function normalise(f: SourceFile): Rec[] {
  const m = f.map, out: Rec[] = [], g = getter(f);
  // completion given as 0–1 fractions → scale to percent
  let pctScale = 1;
  if (m.pct >= 0) {
    let mx = 0;
    for (const r of f.rows) { const n = parseNum(r[m.pct]); if (n != null && n > mx) mx = n; }
    if (mx > 0 && mx <= 1) pctScale = 100;
  }
  const base = f.name.replace(/\.[^.›]+$/, '');
  const hasUser = m.userId >= 0 || m.email >= 0 || m.name >= 0, hasVideo = m.video >= 0 || m.videoId >= 0;
  for (const r of f.rows) {
    const { uKey, uName, uId, email } = person(f, r);
    const vName = str(g(r, 'video')), vId = str(g(r, 'videoId'));
    let vKey = vId || vName, vLabel = vName || vId;
    // a per-video report without a video column: the file itself is the video
    if (!hasVideo && hasUser) vKey = vLabel = base;
    const views = m.views >= 0 ? parseNum(r[m.views]) : 1;
    const min = parseDur(g(r, 'min'), f.unit);
    const p = parseNum(g(r, 'pct'));
    const t = parseDate(g(r, 'time'));
    if (!uKey && !vKey && !t) continue;
    out.push({
      t, uKey, uName, uId, email, vKey, vName: vLabel, folder: str(g(r, 'folder')),
      min: min ?? 0, pct: p == null ? null : Math.max(0, Math.min(100, p * pctScale)), views: views ?? 0, dur: parseDur(g(r, 'dur'), f.unit),
    });
  }
  return out;
}
