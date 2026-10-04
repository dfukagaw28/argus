import { describe, expect, it } from 'vitest';
import { Engine } from '../src/engine/engine';

const csv = (name: string, text: string) => new File([text], name, { type: 'text/csv' });
const H = 'Timestamp,Session Name,Folder Name,UserName,Name,Minutes Delivered\n';
const all = { from: null, to: null, folder: '' };

describe('Engine', () => {
  it('starts on sample data', () => {
    const v = new Engine().query(all);
    expect(v.sample).toBe(true);
    expect(v.agg.nViewers).toBe(36);
    expect(v.agg).not.toHaveProperty('recs');
  });

  it('loads, replaces and removes files', async () => {
    const e = new Engine();
    expect(await e.addFiles([csv('a.csv', H + '2026-04-13 10:00,第1回,A,u1,青木,10\n'), csv('bad.csv', 'x\n')])).toEqual([
      'bad.csv：表として読める行が見つかりませんでした。',
    ]);
    let v = e.query(all);
    expect(v.sample).toBe(false);
    expect(v.files.map(f => [f.name, f.nRows])).toEqual([['a.csv', 1]]);
    expect(v.files[0]).not.toHaveProperty('rows');
    // same name replaces
    await e.addFiles([csv('a.csv', H + '2026-04-13 10:00,第1回,A,u1,青木,10\n2026-04-14 10:00,第1回,A,u2,井上,5\n')]);
    v = e.query(all);
    expect(v.files).toHaveLength(1);
    expect(v.agg.nViewers).toBe(2);
    e.removeFile(v.files[0].id);
    expect(e.query(all).sample).toBe(true);
  });

  it('applies saved layouts and patches', async () => {
    const e = new Engine();
    await e.addFiles([csv('odd.csv', 'Who,When,Watched\n青木,2026-04-13 08:00,600\n')], {
      'who|when|watched': { map: { videoId: -1, video: -1, folder: -1, email: -1, userId: -1, name: 0, time: 1, min: 2, pct: -1, views: -1, dur: -1 }, unit: 'sec', kind: 'views' },
    });
    let v = e.query(all);
    expect(v.files[0].saved).toBe(true);
    expect(v.agg.min).toBe(10);
    e.updateFile(v.files[0].id, { unit: 'min' });
    v = e.query(all);
    expect(v.agg.min).toBe(600);
  });

  it('falls back to all folders when the requested one is gone', async () => {
    const e = new Engine();
    await e.addFiles([csv('a.csv', H + '2026-04-13 10:00,第1回,A,u1,青木,10\n2026-04-13 11:00,第1回,B,u1,青木,10\n')]);
    expect(e.query({ ...all, folder: 'B' }).agg.min).toBe(10);
    const v = e.query({ ...all, folder: 'Z' });
    expect(v.folder).toBe('');
    expect(v.folders).toEqual(['A', 'B']);
  });
});
