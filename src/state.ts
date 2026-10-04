import type { Agg, Rec, SourceFile } from './model/types';
import type { Gran, Metric } from './model/aggregate';

export type Tab = 'videos' | 'users' | 'matrix';
export type SortKey = [key: string, dir: 1 | -1];

export const state = {
  files: [] as SourceFile[],
  sample: true,
  recs: [] as Rec[],
  metric: 'views' as Metric,
  gran: 'day' as Gran,
  tab: 'videos' as Tab,
  mx: 'comp' as 'comp' | 'min',
  q: '',
  sort: { videos: ['min', -1], users: ['min', -1] } as Record<'videos' | 'users', SortKey>,
  agg: null as unknown as Agg,
};
