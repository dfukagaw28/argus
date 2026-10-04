import { describe, expect, it } from 'vitest';
import { parseDate, parseDur, parseNum } from '../src/parse/value';

describe('parseNum', () => {
  it('reads formatted numbers', () => {
    expect(parseNum('1,234')).toBe(1234);
    expect(parseNum('85%')).toBe(85);
    expect(parseNum('')).toBeNull();
    expect(parseNum('abc')).toBeNull();
  });
});

describe('parseDur', () => {
  it('reads clock strings as minutes', () => {
    expect(parseDur('1:30:00', 'min')).toBe(90);
    expect(parseDur('12:30', 'min')).toBe(12.5);
  });
  it('applies the unit', () => {
    expect(parseDur('120', 'sec')).toBe(2);
    expect(parseDur(1.5, 'hour')).toBe(90);
  });
});

describe('parseDate', () => {
  const at = (d: Date | null) => d && [d.getFullYear(), d.getMonth() + 1, d.getDate(), d.getHours(), d.getMinutes()];
  it('reads ISO-like and Japanese forms', () => {
    expect(at(parseDate('2026-04-13 21:05'))).toEqual([2026, 4, 13, 21, 5]);
    expect(at(parseDate('2026/4/13 午後 9:05'))).toEqual([2026, 4, 13, 21, 5]);
    expect(at(parseDate('2026年4月13日 9時5分'))).toEqual([2026, 4, 13, 9, 5]);
  });
  it('reads US M/D/YYYY with AM/PM', () => {
    expect(at(parseDate('4/13/2026 12:10 AM'))).toEqual([2026, 4, 13, 0, 10]);
    expect(at(parseDate('13/4/2026'))).toEqual([2026, 4, 13, 0, 0]);
  });
  it('reads Excel serials and ExcelJS UTC dates as wall-clock', () => {
    expect(at(parseDate(46125.5))).toEqual([2026, 4, 13, 12, 0]);
    expect(at(parseDate(new Date(Date.UTC(2026, 3, 13, 9, 0))))).toEqual([2026, 4, 13, 9, 0]);
  });
  it('rejects junk', () => {
    expect(parseDate('')).toBeNull();
    expect(parseDate(5)).toBeNull();
  });
});
