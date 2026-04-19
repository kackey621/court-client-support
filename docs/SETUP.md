# セットアップガイド

## 目次

1. [配布インストーラーから導入](#配布インストーラーから導入)
2. [ソースからビルド](#ソースからビルド)
3. [初回起動](#初回起動)
4. [Gemini API キーの設定](#gemini-api-キーの設定)
5. [トラブルシューティング](#トラブルシューティング)
6. [アップデート方法](#アップデート方法)

---

## 配布インストーラーから導入

[Releases](../../releases) から各 OS の成果物をダウンロードして実行してください。
Python / NDLOCR-Lite / PDF レンダラなどは **インストーラーに同梱** されており、
追加のセットアップは不要です。

| OS | ファイル | 備考 |
|----|---------|------|
| macOS | `CourtStrategies-*.dmg` | arm64 / x64 |
| Windows | `CourtStrategies-*.exe` | NSIS インストーラー |
| Linux | `CourtStrategies-*.AppImage` / `*.deb` | x64 |

---

## ソースからビルド

### 必要環境

| 項目 | 要件 |
|------|------|
| OS | macOS 12+ / Windows 10+ / Ubuntu 20+ |
| Node.js | v18 以上（推奨: v22） |
| npm | v9 以上 |
| Python | 3.10+（NDLOCR-Lite バンドル生成用） |
| ディスク空き容量 | 2GB 以上 |
| メモリ | 8GB 以上推奨 |

### 手順

```bash
# 1. リポジトリをクローン
git clone https://github.com/YOUR_USERNAME/court-strategies.git
cd court-strategies

# 2. 依存パッケージのインストール
npm install

# 3. ネイティブモジュール（better-sqlite3）を Electron 向けにリビルド
npm run rebuild

# 4. NDLOCR-Lite ランナーをバンドル（初回のみ、数分〜十数分）
npm run build:ndlocr

# 5. 開発モードで起動
npm run dev
```

配布用インストーラーを作成する手順は [docs/BUILD.md](BUILD.md) を参照。

---

## 初回起動

初回起動時に以下が自動実行されます：

1. **データベース作成** — OS ごとのユーザーデータディレクトリ
2. **マイグレーション実行** — テーブル・FTS5 インデックス・トリガーの作成
3. **シードデータ投入** — サンプル案件 1 件、初期設定値の登録
4. **認証ウィザード** — Touch ID / Windows Hello / PIN / なし から選択

初回起動後、以下を確認してください：

- サイドバーに「サンプル案件」が表示される
- 設定ページで API キーが空欄になっている
- サイドバーから新規案件を追加できる

---

## Gemini API キーの設定

### API キーの取得

1. [Google AI Studio](https://aistudio.google.com/) にアクセス
2. Google アカウントでログイン
3. 左メニュー「API keys」→「Create API key」
4. 表示されたキー（`AIzaSy...`）をコピー

### アプリへの登録

1. アプリ起動
2. 左サイドバー最下部の **⚙ 設定** をクリック
3. **API キー** 欄にペースト
4. **使用モデル** を選択（推奨: `Gemini 2.0 Flash`）
5. **保存** ボタンをクリック
6. **接続テスト** で `API キーの接続に成功しました` を確認

### モデルの選択基準

| モデル | 特徴 | 推奨用途 |
|--------|------|----------|
| `gemini-2.0-flash` | 最新・高速 | 通常利用に推奨 |
| `gemini-1.5-flash` | 安定・無料枠大 | 長文の要約 |
| `gemini-1.5-pro` | 高精度・無料枠小 | 複雑な文書分析 |

---

## トラブルシューティング

### `better-sqlite3` のビルドエラー

```
error: no matching function for call to 'SetPrototypeGetter'
```

**原因**: Node.js / Electron のバージョン不一致

**解決策**:

```bash
rm -rf node_modules
npm install
npm run rebuild
```

---

### アプリが起動しない（白画面）

**確認手順**:

1. `npm run dev` のターミナル出力にエラーがないか確認
2. `http://localhost:5173` をブラウザで開いて React 側のエラーを確認
3. Electron DevTools（自動で開く）の Console タブを確認

---

### SQLite エラー: `no such table: cases`

**原因**: DB ファイルが古い / 破損

**解決策**:

```bash
# macOS
rm ~/Library/Application\ Support/court-strategies/court-strategies.db*

# Windows (PowerShell)
Remove-Item "$env:APPDATA\court-strategies\court-strategies.db*"

# Linux
rm ~/.config/court-strategies/court-strategies.db*
```

> **注意**: DB を削除すると登録済みの文書・メモ・会話履歴がすべて消えます。

---

### OCR が動かない

**確認事項**:

- OCR タブにエラーバッジが出ていないか
- `npm run build:ndlocr` が成功したか（ソースビルドの場合）
- 対応ファイルタイプ（PDF / 画像）か

---

### `npm run rebuild` が失敗する

```bash
# Xcode コマンドラインツール（macOS）
xcode-select --install

# Python 3 が存在するか
python3 --version
```

---

## アップデート方法

### 配布インストーラー

上書きインストールしてください。データベースは保持されます。

### ソースビルド

```bash
git pull origin main
npm install
npm run rebuild           # Electron のバージョンが変わった場合
npm run dev
```

> **データベースへの影響**: マイグレーションは冪等（何度実行しても安全）。
> 既存データは保持されます。
