import type { Agg, UserAgg, VideoAgg } from './types';

/** Whether user `u` counts as not having watched video `v`. `th` is a completion % (0 = only missing records). */
export function isMissing(u: UserAgg, v: VideoAgg, th: number): boolean {
  const p = u.pairs.get(v.key);
  if (!p) return true;
  return th > 0 && p.comp != null && p.comp < th;
}

export interface MissingByUser { user: UserAgg; videos: VideoAgg[] }
export interface MissingByVideo { video: VideoAgg; users: UserAgg[] }

export function missingByUser(a: Agg, th: number): MissingByUser[] {
  return [...a.users.values()].map(user => ({ user, videos: a.vList.filter(v => isMissing(user, v, th)) })).filter(x => x.videos.length);
}

export function missingByVideo(a: Agg, th: number): MissingByVideo[] {
  const us = [...a.users.values()];
  return a.vList.map(video => ({ video, users: us.filter(u => isMissing(u, video, th)) }));
}
