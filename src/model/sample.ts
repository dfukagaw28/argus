import { pad } from '../util';
import type { Rec } from './types';

let cache: Rec[] | undefined;
/** Deterministic fictional data: 36 students × 12 lectures. */
export function sampleRecords(): Rec[] {
  if (cache) return cache;
  let seed = 20260413;
  const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
  const titles = ['ガイダンス', 'データの種類と尺度', '記述統計', '確率の基礎', '確率分布', '標本と母集団', '推定', '仮説検定の考え方', 't 検定', '相関と回帰', '分散分析', '総まとめ'];
  const vids = titles.map((t, i) => ({ name: `第${i + 1}回 ${t}`, dur: 35 + Math.floor(rnd() * 50), rel: new Date(2026, 3, 13 + i * 7, 9, 0) }));
  const exam = new Date(2026, 6, 27), out: Rec[] = [];
  for (let s = 1; s <= 36; s++) {
    const dil = 0.35 + rnd() * 0.65, night = rnd() < 0.6;
    vids.forEach((v, i) => {
      if (rnd() > dil + 0.12 - i * 0.012) return;
      const times = 1 + (rnd() < 0.35 ? 1 : 0) + (rnd() < 0.3 ? 1 : 0);
      for (let k = 0; k < times; k++) {
        const late = k > 0 && rnd() < 0.7;
        const t = late ? new Date(exam.getTime() - Math.floor(rnd() * 9) * 864e5) : new Date(v.rel.getTime() + Math.floor(Math.pow(rnd(), 2) * 12) * 864e5);
        t.setHours(night ? 19 + Math.floor(rnd() * 5) : 9 + Math.floor(rnd() * 9), Math.floor(rnd() * 60));
        const frac = Math.min(1, (late ? 0.3 : 0.45) + rnd() * 0.6 * (0.6 + dil * 0.5));
        const id = `s26${pad(s)}`;
        out.push({ t, uKey: id, uName: `受講者 ${pad(s)}`, uId: id, email: `${id}@example.ac.jp`, vKey: v.name, vName: v.name, folder: '統計学入門 2026 前期', min: Math.round(v.dur * frac * 10) / 10, pct: null, views: 1, dur: v.dur });
      }
    });
  }
  return cache = out;
}
