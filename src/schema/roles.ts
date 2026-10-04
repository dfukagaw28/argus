export type RoleKey = 'videoId' | 'video' | 'folder' | 'email' | 'userId' | 'name' | 'time' | 'min' | 'pct' | 'views' | 'dur';
export type ColumnMap = Record<RoleKey, number>;
export type Unit = 'min' | 'sec' | 'hour';

interface Role { k: RoleKey; label: string; exact: string[]; has: string[] }

/** Column roles, matched against normalised header names (exact match first, then substring). */
export const ROLES: Role[] = [
  { k: 'videoId', label: '動画 ID', exact: ['sessionid', 'deliveryid', 'videoid', 'セッションid', '動画id'], has: ['sessionid', 'セッションid'] },
  { k: 'video', label: '動画名', exact: ['sessionname', 'session', 'videoname', 'video', 'title', 'セッション名', 'セッション', '動画名', '動画', 'ビデオ名', 'タイトル'], has: ['sessionname', 'セッション名', '動画名', 'videoname', 'videotitle'] },
  { k: 'folder', label: 'フォルダー', exact: ['foldername', 'folder', 'フォルダー名', 'フォルダ名', 'フォルダー', 'フォルダ'], has: ['foldername', 'フォルダー名', 'フォルダ名'] },
  { k: 'email', label: 'メール', exact: ['email', 'emailaddress', 'mail', 'メール', 'メールアドレス', 'eメール'], has: ['email', 'メール'] },
  { k: 'userId', label: 'ユーザー ID', exact: ['username', 'userid', 'user', 'login', 'ユーザー名', 'ユーザーid', 'ユーザー', 'ユーザ名'], has: ['username', 'userid', 'ユーザー名', 'ユーザーid'] },
  { k: 'name', label: '氏名', exact: ['name', 'fullname', 'displayname', 'viewer', '名前', '氏名', '表示名', '視聴者'], has: ['fullname', 'displayname', '氏名'] },
  { k: 'time', label: '視聴日時', exact: ['timestamp', 'date', 'datetime', 'time', 'viewdate', 'dateandtime', '日時', '日付', '視聴日', '視聴日時', 'タイムスタンプ'], has: ['timestamp', 'datetime', '日時', '日付', 'タイムスタンプ', 'date'] },
  { k: 'min', label: '視聴時間', exact: ['minutesdelivered', 'minutesviewed', 'minutes', 'secondsviewed', 'secondsdelivered', '視聴時間', '配信時間', '配信分数', '再生時間', '視聴分数'], has: ['minutesdelivered', 'minutesviewed', '視聴時間', '配信時間', '配信分', '再生時間', 'minutes', 'secondsviewed'] },
  { k: 'pct', label: '完了率', exact: ['percentcompleted', 'percentviewed', 'percentcomplete', 'completion', '完了率', '視聴率', '完了', '完了の割合'], has: ['percentcompleted', 'percentviewed', '完了率', '視聴率', 'percent', 'completion'] },
  { k: 'views', label: '視聴回数', exact: ['viewsanddownloads', 'views', 'viewcount', '視聴回数', '再生回数', '視聴およびダウンロード', '視聴数'], has: ['viewsanddownloads', '視聴回数', '再生回数', 'views'] },
  { k: 'dur', label: '動画の長さ', exact: ['sessionlength', 'duration', 'sessionduration', 'length', 'videolength', '動画の長さ', '長さ', 'セッションの長さ'], has: ['sessionlength', 'sessionduration', 'duration', '長さ'] },
];
