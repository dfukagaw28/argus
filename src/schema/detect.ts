import { ROLES, type ColumnMap, type Unit } from './roles';

export const normHead = (h: unknown) => String(h ?? '').toLowerCase().replace(/[\s_\-.:：・()（）[\]【】/%％#]/g, '');

export function detectMap(headers: string[]): ColumnMap {
  const hs = headers.map(normHead), used = new Set<number>(), map = {} as ColumnMap;
  for (const r of ROLES) {
    const i = hs.findIndex((h, j) => !used.has(j) && r.exact.includes(h));
    map[r.k] = i; if (i >= 0) used.add(i);
  }
  for (const r of ROLES) {
    if (map[r.k] >= 0) continue;
    const i = hs.findIndex((h, j) => !used.has(j) && !!h && r.has.some(p => h.includes(p) && !/^(average|avg|平均)/.test(h)));
    map[r.k] = i; if (i >= 0) used.add(i);
  }
  return map;
}

export function detectUnit(headers: string[], map: ColumnMap): Unit {
  const h = map.min >= 0 ? normHead(headers[map.min]) : '';
  if (h.includes('second') || h.includes('秒')) return 'sec';
  if (h.includes('hour')) return 'hour';
  return 'min';
}
