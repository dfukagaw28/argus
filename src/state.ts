import type { Agg, Person, Rec, SourceFile } from './model/types';
import type { Gran, Metric } from './model/aggregate';

export type Tab = 'videos' | 'users' | 'matrix' | 'missing';
export type SortKey = [key: string, dir: 1 | -1];

export const state = {
  files: [] as SourceFile[],
  sample: true,
  recs: [] as Rec[],
  roster: [] as Person[],
  /** records dropped because an earlier file already had them */
  dupes: 0,
  /** '' = all folders */
  folder: '',
  metric: 'views' as Metric,
  gran: 'day' as Gran,
  tab: 'videos' as Tab,
  mx: 'comp' as 'comp' | 'min',
  q: '',
  /** 未視聴 tab: group by user or by video */
  missBy: 'user' as 'user' | 'video',
  /** a pair below this completion % also counts as unwatched; 0 = only “no record” */
  missTh: 0,
  sort: { videos: ['min', -1], users: ['min', -1], missing: ['nMissing', -1] } as Record<'videos' | 'users' | 'missing', SortKey>,
  agg: null as unknown as Agg,
};
