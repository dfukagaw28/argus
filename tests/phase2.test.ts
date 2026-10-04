import { beforeEach, describe, expect, it } from 'vitest';
import { parseCsv, toSourceFile } from '../src/io/read';
import { mergeFiles, folders } from '../src/model/merge';
import { aggregate } from '../src/model/aggregate';
import { missingByUser, missingByVideo } from '../src/model/missing';
import { applySaved, forget, save } from '../src/io/prefs';

const file = (name: string, csv: string) => toSourceFile(name, parseCsv(csv));
const HEAD = 'Timestamp,Session Name,Folder Name,UserName,Email,Name,Minutes Delivered,Percent Completed\n';
const views1 = file('apr.csv', HEAD +
  '2026-04-13 21:00,第1回,統計A,u1,u1@x.jp,Aさん,30,90\n' +
  '2026-04-20 10:00,第2回,統計A,u1,u1@x.jp,Aさん,10,40\n' +
  '2026-04-20 11:00,第1回,統計B,u2,u2@x.jp,Bさん,20,70\n');
// overlaps the first file by one record
const views2 = file('apr-may.csv', HEAD +
  '2026-04-20 11:00,第1回,統計B,u2,u2@x.jp,Bさん,20,70\n' +
  '2026-05-01 09:00,第2回,統計A,u2,u2@x.jp,Bさん,25,100\n');
const roster = file('名簿.csv', '学籍番号,氏名,メールアドレス\n,Aさん,U1@x.jp\nu3,Cさん,u3@x.jp\n');

describe('file kind', () => {
  it('detects class lists', () => {
    expect(roster.kind).toBe('roster');
    expect(views1.kind).toBe('views');
  });
});

describe('mergeFiles', () => {
  it('drops records already present in another file', () => {
    const m = mergeFiles([views1, views2]);
    expect(m.dupes).toBe(1);
    expect(m.recs).toHaveLength(4);
  });
  it('keeps repeated rows inside one file', () => {
    const f = file('d.csv', HEAD + '2026-04-13 21:00,第1回,,u1,,A,5,\n2026-04-13 21:00,第1回,,u1,,A,5,\n');
    expect(mergeFiles([f]).recs).toHaveLength(2);
  });
  it('lists folders', () => {
    expect(folders(mergeFiles([views1]).recs)).toEqual(['統計A', '統計B']);
  });
});

describe('aggregate with roster and folder', () => {
  const m = mergeFiles([views1, views2, roster]);
  it('adds roster members who watched nothing and matches by email', () => {
    const a = aggregate(m.recs, { roster: m.roster });
    expect(a.nViewers).toBe(2);
    expect(a.users.size).toBe(3);
    expect(a.users.get('u1')!.inRoster).toBe(true);   // matched via email, case-insensitive
    expect(a.users.get('u2')!.inRoster).toBe(false);  // viewer not on the list
    expect(a.users.get('u3')!.pairs.size).toBe(0);
  });
  it('filters by folder', () => {
    const a = aggregate(m.recs, { folder: '統計B' });
    expect(a.recs).toHaveLength(1);
    expect([...a.users.keys()]).toEqual(['u2']);
  });
});

describe('missing', () => {
  const m = mergeFiles([views1, views2, roster]);
  const a = aggregate(m.recs, { roster: m.roster });
  it('lists unwatched videos per user', () => {
    const by = new Map(missingByUser(a, 0).map(x => [x.user.key, x.videos.map(v => v.name)]));
    expect(by.get('u1')).toBeUndefined();
    expect(by.get('u3')).toEqual(['第1回', '第2回']);
  });
  it('counts low completion as unwatched above a threshold', () => {
    const by = new Map(missingByUser(a, 50).map(x => [x.user.key, x.videos.map(v => v.name)]));
    expect(by.get('u1')).toEqual(['第2回']); // 40% < 50%
  });
  it('lists unwatched users per video', () => {
    expect(missingByVideo(a, 0).map(x => x.users.map(u => u.key))).toEqual([['u3'], ['u3']]);
  });
});

describe('prefs', () => {
  beforeEach(() => {
    const mem = new Map<string, string>();
    globalThis.localStorage = { getItem: k => mem.get(k) ?? null, setItem: (k, v) => void mem.set(k, v), removeItem: k => void mem.delete(k), clear: () => mem.clear(), key: () => null, length: 0 };
  });
  it('remembers a fixed layout for files with the same headers', () => {
    const f = file('a.csv', 'Who,When,Watched\nA,2026-04-13,5\n');
    f.map.name = 0; f.map.min = 2; f.unit = 'sec'; save(f);
    const g = file('b.csv', 'who, when ,watched\nB,2026-04-14,6\n');
    expect(applySaved(g)).toBe(true);
    expect(g.map.name).toBe(0); expect(g.map.min).toBe(2); expect(g.unit).toBe('sec');
    forget(g);
    expect(applySaved(file('c.csv', 'Who,When,Watched\nC,2026-04-15,7\n'))).toBe(false);
  });
});
