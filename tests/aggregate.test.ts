import { describe, expect, it } from 'vitest';
import { parseCsv, toSourceFile } from '../src/io/read';
import { normalise } from '../src/model/normalise';
import { aggregate, seriesData } from '../src/model/aggregate';

const csv = `Timestamp,Session Name,UserName,Name,Minutes Delivered,Percent Completed,Session Length
2026-04-13 21:00,第1回,u1,Aさん,30,0.5,60
2026-04-14 10:00,第1回,u1,Aさん,30,0.9,60
2026-04-20 09:00,第2回,u2,Bさん,15,,30
2026-04-20 22:00,第1回,u2,Bさん,6,0.1,60`;

const recs = () => normalise(toSourceFile('x.csv', parseCsv(csv)));

describe('aggregate', () => {
  it('totals users, videos and completion', () => {
    const a = aggregate(recs());
    expect(a.users.size).toBe(2);
    expect(a.videos.size).toBe(2);
    expect(a.views).toBe(4);
    expect(a.min).toBe(81);
    const u1 = a.users.get('u1')!;
    expect(u1.pairs.get('第1回')!.comp).toBe(90); // max percent, fractions scaled to %
    expect(a.users.get('u2')!.pairs.get('第2回')!.pct).toBeNull();
    expect(a.vList.map(v => v.name)).toEqual(['第1回', '第2回']);
    expect(a.hasClock).toBe(true);
    expect(a.heat[0][21]).toBe(1); // Monday 21:00
  });
  it('filters by inclusive local date range', () => {
    const a = aggregate(recs(), new Date(2026, 3, 14), new Date(2026, 3, 20));
    expect(a.recs).toHaveLength(3);
  });
  it('fills gaps in the series', () => {
    const s = seriesData(aggregate(recs()), 'day', 'views');
    expect(s).toHaveLength(8);
    expect(s[0]).toEqual({ k: '2026-04-13', v: 1 });
    expect(s[7]).toEqual({ k: '2026-04-20', v: 2 });
    expect(seriesData(aggregate(recs()), 'week', 'users').map(x => x.v)).toEqual([1, 1]);
  });
});
