export const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
export const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
export const pad = (n: number) => String(n).padStart(2, '0');
export const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const fmtInt = (n: number) => Math.round(n).toLocaleString('ja-JP');
export const fmt1 = (n: number) => (Math.round(n * 10) / 10).toLocaleString('ja-JP', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
export const fmtDT = (d: Date | null | undefined) => d ? `${ymd(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}` : '';
export const WD = ['月', '火', '水', '木', '金', '土', '日'];
/** Monday = 0 */
export const wday = (d: Date) => (d.getDay() + 6) % 7;
export const byName = (x: string, y: string) => x.localeCompare(y, 'ja', { numeric: true });
