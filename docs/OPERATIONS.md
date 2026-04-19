# 運用ガイド

このドキュメントは、データ追加・管理・バックアップの運用手順をまとめたものです。
エージェント（Claude Code / Cursor 等）と連携して使う場合の指示テンプレートも
含みます。

## 目次

1. [データ追加のワークフロー](#データ追加のワークフロー)
2. [文書インポートの自動化](#文書インポートの自動化)
3. [メモ・タグの命名規則](#メモタグの命名規則)
4. [AI 要約の活用](#ai-要約の活用)
5. [定期的な運用タスク](#定期的な運用タスク)
6. [データベースの直接操作](#データベースの直接操作)
7. [バックアップ・リストア](#バックアップリストア)
8. [コードの拡張・カスタマイズ](#コードの拡張カスタマイズ)
9. [よくある運用 Q&A](#よくある運用-qa)

---

## データ追加のワークフロー

### 新規文書を登録する標準フロー

```
1. ファイルを所定フォルダへ配置
        ↓
2. アプリの「インポート」機能で取込
        ↓
3. OCR がバックグラウンドで自動実行（PDF / 画像）
        ↓
4. AI 要約を生成（オプション）
        ↓
5. タグ・タイトルを整理
        ↓
6. 関連メモを作成
```

### エージェント経由での指示例

```
以下の文書を「{案件名}」案件に登録し、タグとメモを追加してください。

ファイル: ~/Documents/evidence/2024-12-01_mail.pdf
内容: 2024 年 12 月 1 日付の通知メール

タグ候補: 通知, メール, 2024-12
メモ内容: 送信日時・差出人・主張内容の要点をまとめてください。
```

---

## 文書インポートの自動化

### フォルダ一括取込

アプリの「フォルダを選択」機能を使うと、フォルダ内のすべての対応ファイルを
一括取込できます。

**推奨フォルダ構造の例**:

```
~/Documents/Cases/
├── Case-A/
│   ├── 契約書/
│   ├── 請求書/
│   ├── メール/
│   └── 証拠/
├── Case-B/
│   ├── 契約関連/
│   ├── 業務記録/
│   └── 損害証明/
└── Case-C/
    ├── 契約書/
    ├── 通知/
    └── 保険関連/
```

アプリ操作：

1. 対象案件に切替
2. ドキュメントページ → 「+ インポート」→「フォルダを選択」
3. 上記フォルダを指定

インポートと同時に OCR キューへ自動投入されます。

---

## メモ・タグの命名規則

### 推奨タグ体系

エージェントと共通認識を持つため、以下の命名規則を採用してください。

#### 文書種別タグ

| タグ | 対象文書 |
|------|----------|
| `契約書` | 各種契約書 |
| `請求書` | 請求・領収書類 |
| `メール` | メール・チャット記録 |
| `通知書` | 内容証明・通知書 |
| `証拠` | 証拠として使用予定の文書 |
| `陳述書` | 証人陳述書・意見書 |
| `判決文` | 判決・決定・審判 |
| `準備書面` | 訴訟準備書面 |
| `保険` | 保険関連文書 |

#### 重要度タグ

| タグ | 意味 |
|------|------|
| `重要` | 弁護士に見せるべき重要文書 |
| `要確認` | 内容確認が必要 |
| `証拠採用済` | 証拠として採用されたもの |
| `弁護士確認済` | 弁護士が確認済 |

#### 日付タグ

`YYYY-MM` 形式を推奨：`2024-03`, `2025-01` など

---

### メモのテンプレート

#### 文書要点メモ

```
【文書概要】
種別: [契約書/メール/請求書/等]
日付: YYYY-MM-DD
当事者: [発行者] → [受取人]

【主要な記載事項】
-
-
-

【法的な重要ポイント】
-

【関連する法令・条文】
-

【弁護士への質問事項】
-
```

#### 調査メモ

```
【調査内容】
テーマ:
調査日: YYYY-MM-DD

【調査結果】


【参照した法令・判例】
-

【案件への示唆】


【次のアクション】
-
```

---

## AI 要約の活用

### 個別生成

1. 文書詳細 → 「AI 要約」タブ → 「要約生成」ボタン
2. 要約が生成されたら内容を確認・必要に応じて修正
3. 「再生成」で内容を変えて生成し直すことも可能

### 一括処理の指示例（エージェント）

```
「{案件名}」案件の未要約文書一覧を確認して、
OCR テキストがある文書について順番に AI 要約を生成してください。

要約の観点：
1. 文書の種別と日付
2. 主要な主張・事実
3. 法的リスク・重要ポイント
4. 弁護士に伝えるべき事項
```

---

## 定期的な運用タスク

### 週次タスク

| タスク | 方法 |
|--------|------|
| 新着文書のインポート | フォルダ取込 or ドラッグ&ドロップ |
| 未 OCR 文書の確認 | OCR タブで `error` 状態の有無を確認 |
| メモの更新 | 弁護士との協議後に要点を追記 |
| 重要文書のブックマーク | 詳細ページの★ボタン |

### 月次タスク

| タスク | 方法 |
|--------|------|
| データベースのバックアップ | 下記「バックアップ」参照 |
| 要約の見直し | 新証拠・新事実が出た場合に再生成 |

### 弁護士面談前タスク

1. 関連文書をブックマーク整理
2. AI Flash で論点を整理
3. 法令検索で根拠条文を確認
4. 要点メモを作成して Word 出力

---

## データベースの直接操作

> **注意**: アプリ起動中は SQLite が WAL モードで開かれています。
> 直接操作はアプリを終了した状態で行ってください。

### SQLite CLI のインストール

```bash
# macOS
brew install sqlite

# sqlite3 コマンドが既に入っているか確認
sqlite3 --version
```

### DB への接続

| OS | パス |
|----|------|
| macOS | `~/Library/Application Support/court-strategies/court-strategies.db` |
| Windows | `%APPDATA%\court-strategies\court-strategies.db` |
| Linux | `~/.config/court-strategies/court-strategies.db` |

```bash
sqlite3 ~/Library/Application\ Support/court-strategies/court-strategies.db
```

### よく使うクエリ

#### 案件一覧

```sql
SELECT id, slug, title, color FROM cases;
```

#### 文書一覧（案件別）

```sql
SELECT id, title, file_type, ocr_status, summary_at
FROM documents
WHERE case_id = ?
ORDER BY imported_at DESC;
```

#### OCR 未実行・エラーの文書を確認

```sql
SELECT title, file_type, file_path, ocr_status, ocr_error
FROM documents
WHERE ocr_status IN ('pending', 'running', 'error')
ORDER BY imported_at DESC;
```

#### タグで文書を絞り込む

```sql
SELECT id, title, tags
FROM documents
WHERE tags LIKE '%証拠%'
AND case_id = ?;
```

#### メモ一覧（ピン留め優先）

```sql
SELECT title, body, tags, is_pinned
FROM notes
WHERE case_id = ?
ORDER BY is_pinned DESC, updated_at DESC;
```

#### 検索履歴の確認

```sql
SELECT query, COUNT(*) as count
FROM search_history
WHERE case_id = ?
GROUP BY query
ORDER BY count DESC
LIMIT 20;
```

#### 新規案件を追加

```sql
INSERT INTO cases (slug, title, description, color)
VALUES ('new-case', '新しい案件名', '案件の説明', '#22c55e');
```

---

## バックアップ・リストア

### バックアップ

```bash
# DB をバックアップ（アプリ終了後に実行）
cp ~/Library/Application\ Support/court-strategies/court-strategies.db \
   ~/Documents/Backup/court-strategies-$(date +%Y%m%d).db
```

### 定期バックアップスクリプト（参考）

```bash
#!/bin/bash
# ~/backup-court-db.sh

BACKUP_DIR=~/Documents/CourtStrategiesBackup
DB_PATH=~/Library/Application\ Support/court-strategies/court-strategies.db
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR
cp "$DB_PATH" "$BACKUP_DIR/court-strategies-$DATE.db"

# 30 日より古いバックアップを削除
find $BACKUP_DIR -name "*.db" -mtime +30 -delete
```

### リストア

```bash
# アプリを終了してからリストア
cp ~/Documents/Backup/court-strategies-20250101.db \
   ~/Library/Application\ Support/court-strategies/court-strategies.db
```

---

## コードの拡張・カスタマイズ

### 機能追加の際のファイル対応表

| やりたいこと | 変更するファイル |
|-------------|-----------------|
| 新しい API 連携を追加 | `src/renderer/src/services/` に新ファイル |
| 新しいページを追加 | `src/renderer/src/pages/` + `src/renderer/src/App.tsx` にルート追加 |
| 新しいサイドバーメニュー | `src/renderer/src/components/layout/Sidebar.tsx` |
| DB のテーブルを追加 | `src/main/db/index.ts` の `MIGRATIONS` 配列に追加 |
| 新しい IPC 通信 | `src/main/ipc/` に新ファイル → `src/main/ipc/index.ts` に登録 → `src/preload/index.ts` に追加 |
| UI コンポーネント追加 | `src/renderer/src/components/` |
| 状態管理を追加 | `src/renderer/src/store/` に新ファイル → `src/renderer/src/store/index.ts` にエクスポート |

### DB マイグレーションの追加方法

`src/main/db/index.ts` の `MIGRATIONS` 配列に追加する：

```typescript
const MIGRATIONS = [
  // 既存マイグレーション...
  {
    name: '00X_new_feature',
    sql: `
      CREATE TABLE IF NOT EXISTS your_new_table (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        case_id INTEGER NOT NULL REFERENCES cases(id),
        content TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
      );
    `
  }
]
```

マイグレーションは冪等（既に適用済みのものはスキップ）です。

---

## よくある運用 Q&A

### Q: ファイルを別の場所に移動したらプレビューできなくなった

**A**: アプリはファイルパスを参照しているため、ファイル移動後はパスが無効になります。

対処法：

1. データベースの `file_path` を更新する
2. または文書を削除して再インポートする

```sql
UPDATE documents
SET file_path = '/new/path/to/file.pdf'
WHERE id = ?;
```

---

### Q: 誤って文書を削除してしまった

**A**: アプリの「削除」は DB レコードを削除するのみで、元ファイルは削除されません。
元ファイルが残っていれば再インポートで復元できます。

---

### Q: OCR の精度が悪い

**A**:

1. **言語設定を確認**: 設定 → OCR 言語 を `jpn+eng` に変更
2. **画像品質を改善**: スキャン解像度を 300dpi 以上に
3. **傾き補正**: 文書が傾いている場合は補正してからスキャン
4. エラーが繰り返す場合は OCR タブから再実行

---

### Q: AI 要約の結果が不正確

**A**:

1. OCR テキストが正確かどうか先に確認
2. 「再生成」ボタンで別の応答を取得
3. AI Flash で「この要約で〇〇の部分が不正確です。修正してください」と指示
