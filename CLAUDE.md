# CourtStrategies — 法律案件管理システム

## プロジェクト概要

法律案件の文書管理・検索・AI分析ツール。Electron + React + SQLite で実装。

## 技術スタック

- **Electron 33** + **React 18** + **TypeScript**
- **electron-vite** (ビルドツール)
- **better-sqlite3** (ローカルDB、メインプロセスのみ)
- **NDLOCR-Lite** (インストーラー同梱、メインプロセスから spawn) / **Tesseract.js v5** (フォールバック)
- **Google Gemini API** (AI要約・Q&A)
- **e-gov 法令API v2** (法令検索)
- **Tailwind CSS v3** (スタイリング)
- **Zustand v5** (状態管理)

## ディレクトリ構成

```
src/
├── main/          # Electron メインプロセス (Node.js)
│   ├── db/        # SQLite スキーマ・マイグレーション
│   ├── ipc/       # IPC ハンドラー
│   └── services/  # ファイル操作
├── preload/       # コンテキストブリッジ
└── renderer/      # React レンダラー
    └── src/
        ├── components/
        ├── pages/
        ├── services/  # Gemini API、OCR、e-gov API
        ├── store/     # Zustand ストア
        └── types/
```

## 開発コマンド

```bash
npm run dev      # 開発サーバー起動
npm run build    # プロダクションビルド
npm run rebuild  # ネイティブモジュールを Electron 用にリビルド
npm run package  # アプリケーションパッケージング
```

## 初回セットアップ

```bash
npm install
npm run rebuild  # better-sqlite3 のビルド（初回のみ必要）
npm run dev
```

## データベース

SQLite DB は `~/Library/Application Support/court-strategies/court-strategies.db` に保存。
FTS5 仮想テーブルで全文検索対応。

## API設定

設定画面から Gemini API キーを変更できる。
初期値は `src/main/db/index.ts` の seed で設定。

## セキュリティ

- 全データはローカルのみ
- Gemini API は HTTPS 経由（ユーザーデータ学習なし）
- e-gov API は公開 API
