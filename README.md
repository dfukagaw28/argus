# argus — Panopto 視聴集計

Panopto の統計レポート（CSV / xlsx）を読み込み、受講者別・動画別・日別に集計して Excel に書き出すブラウザアプリ。

- 公開先: https://dfukagaw28.github.io/argus/
- **ファイルはブラウザ内だけで処理**し、外部へは送信しない（CSP で `connect-src 'none'`）。
- 元になった単一 HTML 版は `_docs/` にある。

## 開発

```sh
npm ci
npm run dev      # 開発サーバー
npm test         # Vitest
npm run build    # dist/ に出力（CSP はビルド時のみ付与）
```

`main` に push すると GitHub Actions がテスト・ビルドして Pages にデプロイする。

## 構成

| パス | 役割 |
| --- | --- |
| `src/schema/` | 列名の辞書と自動判別 |
| `src/parse/` | 数値・時間・日時の読み取り |
| `src/io/` | CSV / xlsx 読み込み、Excel 書き出し（ExcelJS は遅延読み込み） |
| `src/model/` | 正規化・集計（DOM 非依存、テスト対象） |
| `src/ui/` | グラフ・表・ファイル一覧の描画 |
| `tests/` | 単体テスト |

**注意:** リポジトリは private でも、Pages のサイトは公開される。実データ（受講者情報を含む CSV など）はコミットしないこと。
