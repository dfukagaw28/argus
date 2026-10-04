import type { ColumnMap } from './roles';
import type { FileKind } from '../model/types';

/** A table with people but no viewing columns is a class list. */
export function detectKind(m: ColumnMap): FileKind {
  const hasUser = m.userId >= 0 || m.email >= 0 || m.name >= 0;
  const hasViewing = [m.video, m.videoId, m.time, m.min, m.pct, m.views, m.dur].some(i => i >= 0);
  return hasUser && !hasViewing ? 'roster' : 'views';
}
