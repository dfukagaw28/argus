import { parseDate, parseDur, parseNum, str } from '../parse/value';
import type { RoleKey } from '../schema/roles';
import type { Rec, SourceFile } from './types';

export function normalise(f: SourceFile): Rec[] {
  const m = f.map, out: Rec[] = [];
  const g = (r: SourceFile['rows'][number], k: RoleKey) => m[k] >= 0 ? r[m[k]] : null;
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
    const uid = str(g(r, 'userId')), em = str(g(r, 'email')), nm = str(g(r, 'name'));
    const uKey = (uid || em || nm).toLowerCase();
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
      t, uKey, uName: nm || uid || em, uId: uid, email: em, vKey, vName: vLabel, folder: str(g(r, 'folder')),
      min: min ?? 0, pct: p == null ? null : Math.max(0, Math.min(100, p * pctScale)), views: views ?? 0, dur: parseDur(g(r, 'dur'), f.unit),
    });
  }
  return out;
}
