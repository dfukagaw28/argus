import type { ColumnMap, Unit } from '../schema/roles';
import type { Cell } from '../parse/value';

/** 'views' = viewing report, 'roster' = class list (user columns only). */
export type FileKind = 'views' | 'roster';

/** One loaded table (a CSV file or one worksheet). */
export interface SourceFile { id: string; name: string; headers: string[]; rows: Cell[][]; map: ColumnMap; unit: Unit; kind: FileKind;
  /** column map came from a remembered layout */ saved?: boolean }

/** One person from a class list. */
export interface Person { uKey: string; uName: string; uId: string; email: string }

/** One normalised viewing record. `min` and `dur` are minutes, `pct` is 0–100. */
export interface Rec {
  t: Date | null; uKey: string; uName: string; uId: string; email: string;
  vKey: string; vName: string; folder: string; min: number; pct: number | null; views: number; dur: number | null;
}

export interface Pair { min: number; views: number; pct: number | null; comp: number | null }
export interface UserAgg { key: string; name: string; id: string; email: string; views: number; min: number; last: Date | null; pairs: Map<string, Pair>; nVideos: number; comp: number | null;
  /** listed in a loaded roster */ inRoster: boolean }
export interface VideoAgg { key: string; name: string; folder: string; dur: number | null; views: number; min: number; users: Set<string>; first: Date | null; cSum: number; cN: number; nUsers: number; comp: number | null; per: number | null }
export interface DayAgg { date: Date; views: number; min: number; users: Set<string> }

export interface Agg {
  recs: Rec[];
  /** users: everyone who watched, plus roster members who did not */
  users: Map<string, UserAgg>; videos: Map<string, VideoAgg>; vList: VideoAgg[]; days: Map<string, DayAgg>;
  heat: number[][]; views: number; min: number; tMin: Date | null; tMax: Date | null; hasClock: boolean; anyComp: boolean; comp: number | null;
  /** users with at least one view */ nViewers: number; hasRoster: boolean;
}
