import { readTables, toSourceFile } from '../io/read';
import { applySaved, type SavedLayouts } from '../io/prefs';
import { folders as listFolders, mergeFiles, type Merged } from '../model/merge';
import { aggregate } from '../model/aggregate';
import { sampleRecords } from '../model/sample';
import type { Agg, FileKind, SourceFile } from '../model/types';
import type { ColumnMap, Unit } from '../schema/roles';

/** A loaded file as the UI sees it: everything but the rows. */
export type FileInfo = Omit<SourceFile, 'rows'> & { nRows: number };
/** Aggregate without the per-record list, which stays in the engine. */
export type AggView = Omit<Agg, 'recs'> & { nRecs: number };

export interface Query { from: Date | null; to: Date | null; folder: string }
export interface FilePatch { map?: Partial<ColumnMap>; unit?: Unit; kind?: FileKind }

export interface View {
  agg: AggView; files: FileInfo[]; folders: string[];
  /** folder actually applied ('' when the requested one no longer exists) */
  folder: string; dupes: number; sample: boolean;
}

const info = ({ rows, ...f }: SourceFile): FileInfo => ({ ...f, nRows: rows.length });

/**
 * Holds the loaded files and does all heavy work (parsing, merging, aggregation, Excel).
 * Runs inside a Web Worker in the app; tests drive it directly.
 */
export class Engine {
  private files: SourceFile[] = [];
  private merged: Merged | null = null;

  get sample() { return !this.files.length; }

  /** Reads files; a file with the same name as a loaded one replaces it. Returns error messages. */
  async addFiles(list: File[], saved: SavedLayouts = {}): Promise<string[]> {
    const errs: string[] = [];
    for (const file of list) {
      try {
        const tables = await readTables(file);
        if (!tables.length) throw new Error('データのあるシートが見つかりませんでした。');
        for (const t of tables) {
          const f = toSourceFile(t.name, t.rows);
          f.saved = applySaved(f, saved);
          this.files = this.files.filter(x => x.name !== f.name); this.files.push(f);
        }
      } catch (e) { errs.push(`${file.name}：${(e as Error)?.message || '読み込めませんでした。'}`); }
    }
    this.merged = null;
    return errs;
  }

  removeFile(id: string) { this.files = this.files.filter(f => f.id !== id); this.merged = null; }

  updateFile(id: string, p: FilePatch) {
    const f = this.files.find(x => x.id === id); if (!f) return;
    if (p.map) Object.assign(f.map, p.map);
    if (p.unit) f.unit = p.unit;
    if (p.kind) f.kind = p.kind;
    f.saved = true;
    this.merged = null;
  }

  setSaved(id: string, saved: boolean) { const f = this.files.find(x => x.id === id); if (f) f.saved = saved; }

  private data(): Merged {
    if (this.sample) return { recs: sampleRecords(), roster: [], dupes: 0 };
    return this.merged ??= mergeFiles(this.files);
  }

  private agg(q: Query): { agg: Agg; folders: string[]; folder: string } {
    const d = this.data(), folders = listFolders(d.recs), folder = folders.includes(q.folder) ? q.folder : '';
    return { agg: aggregate(d.recs, { from: q.from, to: q.to, folder, roster: d.roster }), folders, folder };
  }

  query(q: Query): View {
    const { agg: { recs, ...rest }, folders, folder } = this.agg(q);
    return { agg: { ...rest, nRecs: recs.length }, files: this.files.map(info), folders, folder, dupes: this.data().dupes, sample: this.sample };
  }

  async exportXlsx(q: Query, missTh: number): Promise<ArrayBuffer> {
    const { buildWorkbook } = await import('../io/export');
    const { agg, folder } = this.agg(q);
    const source = this.sample ? 'サンプルデータ（架空）' : this.files.map(f => f.name).join('、') + (folder ? `（フォルダー：${folder}）` : '');
    return buildWorkbook(agg, source, missTh);
  }
}
