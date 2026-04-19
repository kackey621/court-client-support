# CourtStrategies — 法律案件管理システム

> ローカル動作・機密情報保護の法律文書管理デスクトップアプリ

[![Electron](https://img.shields.io/badge/Electron-33-47848F?logo=electron)](https://www.electronjs.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![SQLite](https://img.shields.io/badge/SQLite-FTS5-003B57?logo=sqlite)](https://www.sqlite.org/)

---

## 概要

法律係争案件における文書管理・証拠整理・AI 分析・法令検索を一元化する
Electron デスクトップアプリです。データはすべてローカルに保存され、
外部サーバーへは送信されません（AI API・法令 API への問い合わせを除く）。

初回起動時にはデモ用の「サンプル案件」が 1 件作成されます。
実運用では UI から案件を追加・編集してください。

---

## 機能一覧

| 機能 | 説明 |
|------|------|
| **案件切替** | 複数案件をサイドバーで即切替 |
| **文書インポート** | PDF・画像・Word・ZIP・フォルダをドラッグ&ドロップまたはダイアログで取込 |
| **文書プレビュー** | PDF・画像・Word をアプリ内でプレビュー |
| **OCR** | NDLOCR-Lite を同梱し、インポート時に自動でテキスト抽出 |
| **AI 要約** | Gemini API によるドキュメント自動要約 |
| **AI Flash** | 文書に対してチャット形式の Q&A（会話履歴保存） |
| **全文検索** | SQLite FTS5 による高速全文検索、検索履歴・推薦クエリ表示 |
| **法令検索** | e-gov 法令 API v2 でリアルタイム条文検索・表示 |
| **判例検索** | 裁判所・D1-Law 等へのリンク検索 |
| **メモ・Wiki / ブックマーク** | タグ付きメモ、文書 Wiki、ピン留め、ブックマーク |
| **出力** | Word / HTML / テキストに整形出力、OCR テキスト単独 `.txt` 出力 |
| **印刷・コピー** | 文書の印刷・テキストコピー |
| **認証** | Touch ID / Windows Hello / 6 桁 PIN から選択 |

---

## インストール

### エンドユーザー向け（推奨）

[Releases](../../releases) から各 OS 用のインストーラーを取得:

| OS | ファイル |
|----|---------|
| macOS | `CourtStrategies-*.dmg` |
| Windows | `CourtStrategies-*.exe` (NSIS) |
| Linux | `CourtStrategies-*.AppImage` または `.deb` |

インストーラーに Python ランタイム・NDLOCR-Lite・PDF レンダラを
同梱しているため、**追加の依存パッケージ導入は不要** です。

### ソースからビルド

```bash
git clone https://github.com/YOUR_USERNAME/court-strategies.git
cd court-strategies
npm install
npm run rebuild             # ネイティブモジュールを Electron 用にリビルド
npm run build:ndlocr        # NDLOCR-Lite ランナーをバンドル（Python 3.10+ 必要）
npm run dev                 # 開発起動
```

詳細は [docs/BUILD.md](docs/BUILD.md) を参照してください。

### Gemini API キーの設定

1. [Google AI Studio](https://aistudio.google.com/) で API キーを取得
2. アプリ起動後、左サイドバー下部の **⚙ 設定** をクリック
3. **API キー** 欄に入力 → **保存**
4. **接続テスト** ボタンで動作確認

---

## 開発コマンド

```bash
npm run dev             # 開発モード起動（HMR 有効）
npm run build           # プロダクションビルド
npm run rebuild         # ネイティブモジュールを Electron 向けにリビルド
npm run build:ndlocr    # NDLOCR-Lite バンドルを生成
npm run package:mac     # macOS インストーラー (.dmg) を生成
npm run package:win     # Windows インストーラー (.exe) を生成
npm run package:linux   # Linux インストーラー (.AppImage + .deb) を生成
```

---

## アーキテクチャ

```
┌─────────────────────────────────────────────────┐
│               Electron Main Process              │
│  ┌──────────┐  ┌──────────┐  ┌───────────────┐ │
│  │ SQLite   │  │ IPC      │  │ OCR キュー     │ │
│  │ FTS5     │  │ Handlers │  │ + NDLOCR-Lite │ │
│  └──────────┘  └──────────┘  └───────────────┘ │
├─────────────────────────────────────────────────┤
│              contextBridge (Preload)             │
├─────────────────────────────────────────────────┤
│               React Renderer Process             │
│  ┌──────────┐  ┌──────────┐  ┌───────────────┐ │
│  │ Gemini   │  │ 検索/UI  │  │  e-gov 法令   │ │
│  │   API    │  │          │  │     API       │ │
│  └──────────┘  └──────────┘  └───────────────┘ │
└─────────────────────────────────────────────────┘
```

### 技術スタック

| レイヤー | 技術 |
|---------|------|
| デスクトップ | Electron 33 |
| ビルド | electron-vite 2 |
| UI | React 18 + TypeScript 5 |
| スタイル | Tailwind CSS 3 |
| 状態管理 | Zustand 5 |
| ルーティング | React Router 6 (Hash Router) |
| データベース | better-sqlite3 (FTS5) |
| OCR | NDLOCR-Lite (Python 同梱) / Tesseract.js 5 フォールバック |
| PDF | pypdfium2 |
| AI | Google Gemini API (REST) |
| 法令 | e-gov 法令 API v2 |
| ファイル処理 | adm-zip, mammoth |

---

## データの保存場所

| OS | パス |
|----|------|
| macOS | `~/Library/Application Support/court-strategies/court-strategies.db` |
| Windows | `%APPDATA%\court-strategies\court-strategies.db` |
| Linux | `~/.config/court-strategies/court-strategies.db` |

---

## セキュリティ

- **全データローカル保存** — データベース・ファイルはすべてローカル
- **Gemini API** — 問い合わせのみ。ユーザーデータを学習に使用しない旨がポリシーで明記
- **e-gov API** — 公開 API（法令テキストのみ取得）
- **API キー** — SQLite の settings テーブルに保存（ソースコードには含まれない）
- **contextIsolation** — Electron 標準のセキュリティ設定を適用

---

## ドキュメント

| ファイル | 内容 |
|----------|------|
| [docs/SETUP.md](docs/SETUP.md) | 詳細セットアップ・トラブルシューティング |
| [docs/USAGE.md](docs/USAGE.md) | 機能別操作マニュアル |
| [docs/OPERATIONS.md](docs/OPERATIONS.md) | 運用・データ管理・カスタマイズ |
| [docs/DATA_SCHEMA.md](docs/DATA_SCHEMA.md) | データスキーマ・API 仕様 |
| [docs/BUILD.md](docs/BUILD.md) | クロスプラットフォームビルド手順 |

---

## 謝辞

本アプリは多数のオープンソースプロジェクトと公開 API の上に成り立っています。
詳細は [ACKNOWLEDGMENTS.md](ACKNOWLEDGMENTS.md) を参照してください。

特に日本語 OCR の中核として [NDLOCR-Lite（国立国会図書館）](https://github.com/ndl-lab) を
同梱させていただいています。優れた成果を公開してくださっている皆様に深く感謝いたします。

## ライセンス

[MIT License](LICENSE)
