import { byName, pad, wday, WD, ymd } from '../util';
import type { Agg, DayAgg, Person, Rec, UserAgg, VideoAgg } from './types';

export type Gran = 'day' | 'week' | 'month';

export function bucketKey(d: Date, gran: Gran): string {
  if (gran === 'month') return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
  if (gran === 'week') { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() - wday(x)); return ymd(x); }
  return ymd(d);
}

export interface AggOptions {
  /** inclusive local dates; records without a date are always kept */
  from?: Date | null; to?: Date | null;
  /** '' = all folders */
  folder?: string;
  /** class list: members who watched nothing are added with zero totals */
  roster?: Person[];
}

export function aggregate(all: Rec[], { from = null, to = null, folder = '', roster = [] }: AggOptions = {}): Agg {
  const toEnd = to ? new Date(to.getFullYear(), to.getMonth(), to.getDate() + 1).getTime() - 1 : null;
  const users = new Map<string, UserAgg>(), videos = new Map<string, VideoAgg>(), days = new Map<string, DayAgg>();
  const heat = WD.map(() => new Array<number>(24).fill(0));
  let views = 0, min = 0, tMin: Date | null = null, tMax: Date | null = null, hasClock = false;
  const recs: Rec[] = [];
  for (const r of all) {
    if (r.t && ((from && r.t < from) || (toEnd != null && +r.t > toEnd))) continue;
    if (folder && r.folder !== folder) continue;
    recs.push(r); views += r.views; min += r.min;
    if (r.t) {
      if (!tMin || r.t < tMin) tMin = r.t;
      if (!tMax || r.t > tMax) tMax = r.t;
      const k = ymd(r.t); let d = days.get(k);
      if (!d) days.set(k, d = { date: new Date(r.t.getFullYear(), r.t.getMonth(), r.t.getDate()), views: 0, min: 0, users: new Set() });
      d.views += r.views; d.min += r.min; if (r.uKey) d.users.add(r.uKey);
      if (r.t.getHours() || r.t.getMinutes()) hasClock = true;
      heat[wday(r.t)][r.t.getHours()] += r.views;
    }
    if (r.vKey) {
      let v = videos.get(r.vKey);
      if (!v) videos.set(r.vKey, v = { key: r.vKey, name: r.vName, folder: r.folder, dur: null, views: 0, min: 0, users: new Set(), first: null, cSum: 0, cN: 0, nUsers: 0, comp: null, per: null });
      v.views += r.views; v.min += r.min; if (r.uKey) v.users.add(r.uKey);
      if (r.dur && (!v.dur || r.dur > v.dur)) v.dur = r.dur;
      if (!v.folder && r.folder) v.folder = r.folder;
      if (r.t && (!v.first || r.t < v.first)) v.first = r.t;
    }
    if (r.uKey) {
      let u = users.get(r.uKey);
      if (!u) users.set(r.uKey, u = newUser(r));
      u.views += r.views; u.min += r.min;
      if (r.t && (!u.last || r.t > u.last)) u.last = r.t;
      if (!u.email && r.email) u.email = r.email;
      if (!u.id && r.uId) u.id = r.uId;
      if (r.vKey) {
        let p = u.pairs.get(r.vKey);
        if (!p) u.pairs.set(r.vKey, p = { min: 0, views: 0, pct: null, comp: null });
        p.min += r.min; p.views += r.views;
        if (r.pct != null && (p.pct == null || r.pct > p.pct)) p.pct = r.pct;
      }
    }
  }
  const nViewers = users.size;
  if (roster.length) {
    // match roster members to viewers by key, user ID or email (the two sources may key people differently)
    const lc = (s: string) => s.toLowerCase(), byAlias = new Map<string, UserAgg>();
    for (const u of users.values()) for (const k of [u.key, lc(u.id), lc(u.email)]) if (k && !byAlias.has(k)) byAlias.set(k, u);
    for (const p of roster) {
      const u = [p.uKey, lc(p.uId), lc(p.email)].map(k => k && byAlias.get(k)).find(Boolean);
      if (u) {
        u.inRoster = true;
        if (p.uName && (u.name === u.id || u.name === u.email)) u.name = p.uName;
        if (!u.id && p.uId) u.id = p.uId; if (!u.email && p.email) u.email = p.email; continue; }
      if (!users.has(p.uKey)) { const n = newUser(p); n.inRoster = true; users.set(p.uKey, n); }
    }
  }
  // completion: explicit max percent, else watched minutes ÷ video length (capped at 100)
  let anyComp = false, cSumAll = 0, cNAll = 0;
  for (const u of users.values()) {
    let s = 0, c = 0;
    for (const [vk, p] of u.pairs) {
      const v = videos.get(vk)!;
      p.comp = p.pct != null ? p.pct : (v.dur ? Math.min(100, p.min / v.dur * 100) : null);
      if (p.comp != null) { s += p.comp; c++; v.cSum += p.comp; v.cN++; anyComp = true; }
    }
    u.nVideos = u.pairs.size; u.comp = c ? s / c : null; cSumAll += s; cNAll += c;
  }
  for (const v of videos.values()) { v.nUsers = v.users.size; v.comp = v.cN ? v.cSum / v.cN : null; v.per = v.nUsers ? v.min / v.nUsers : null; }
  const vList = [...videos.values()].sort((a, b) => (a.first && b.first ? +a.first - +b.first : 0) || byName(a.name, b.name));
  return { recs, users, videos, vList, days, heat, views, min, tMin, tMax, hasClock, anyComp, comp: cNAll ? cSumAll / cNAll : null, nViewers, hasRoster: roster.length > 0 };
}

const newUser = (p: Person): UserAgg =>
  ({ key: p.uKey, name: p.uName, id: p.uId, email: p.email, views: 0, min: 0, last: null, pairs: new Map(), nVideos: 0, comp: null, inRoster: false });

export type Metric = 'views' | 'min' | 'users';

/** Time series with empty buckets filled so the axis is continuous. */
export function seriesData(a: Pick<Agg, 'days'>, gran: Gran, metric: Metric): { k: string; v: number }[] {
  const m = new Map<string, { views: number; min: number; users: Set<string> }>();
  for (const d of a.days.values()) {
    const k = bucketKey(d.date, gran);
    let b = m.get(k); if (!b) m.set(k, b = { views: 0, min: 0, users: new Set() });
    b.views += d.views; b.min += d.min; d.users.forEach(x => b!.users.add(x));
  }
  if (!m.size) return [];
  const keys = [...m.keys()].sort(), end = keys[keys.length - 1], out: { k: string; v: number }[] = [];
  const [y, mo, da] = keys[0].split('-').map(Number), cur = new Date(y, mo - 1, da || 1);
  for (let i = 0; i < 5000; i++) {
    const k = bucketKey(cur, gran), b = m.get(k);
    out.push({ k, v: b ? (metric === 'users' ? b.users.size : b[metric]) : 0 });
    if (k >= end) break;
    if (gran === 'month') cur.setMonth(cur.getMonth() + 1); else cur.setDate(cur.getDate() + (gran === 'week' ? 7 : 1));
  }
  return out;
}
