import { describe, expect, it } from 'vitest';
import { decodeText, parseCsv, toSourceFile } from '../src/io/read';
import { detectMap } from '../src/schema/detect';

describe('detectMap', () => {
  it('maps English Panopto headers', () => {
    const m = detectMap(['Timestamp', 'Session Name', 'Session ID', 'Folder Name', 'UserName', 'Name', 'Email', 'Minutes Delivered', 'Average Minutes', 'Percent Completed']);
    expect(m).toMatchObject({ time: 0, video: 1, videoId: 2, folder: 3, userId: 4, name: 5, email: 6, min: 7, pct: 9 });
  });
  it('maps Japanese headers and ignores averages', () => {
    const m = detectMap(['日時', 'セッション名', '氏名', '平均視聴時間', '視聴時間（分）']);
    expect(m).toMatchObject({ time: 0, video: 1, name: 2, min: 4 });
  });
});

describe('decodeText', () => {
  it('falls back to Shift_JIS', () => {
    const sjis = new Uint8Array([0x93, 0xfa, 0x8e, 0x9e]); // 日時
    expect(decodeText(sjis.buffer)).toBe('日時');
  });
});

describe('toSourceFile', () => {
  it('skips title rows above the header', () => {
    const f = toSourceFile('r.csv', parseCsv('﻿レポート\n\nName,Minutes Viewed,Date\n山田,10,2026-04-13\n'));
    expect(f.headers).toEqual(['Name', 'Minutes Viewed', 'Date']);
    expect(f.rows).toHaveLength(1);
    expect(f.map.name).toBe(0);
  });
});
