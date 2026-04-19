# データスキーマ・API仕様

## データベーススキーマ

### テーブル一覧

| テーブル | 用途 |
|---------|------|
| `cases` | 案件マスタ |
| `documents` | 文書レコード |
| `documents_fts` | 全文検索インデックス（仮想テーブル） |
| `notes` | メモ |
| `bookmarks` | ブックマーク |
| `search_history` | 検索履歴 |
| `settings` | アプリ設定 |
| `ai_conversations` | AI会話履歴 |
| `_migrations` | マイグレーション管理 |

---

### cases（案件）

```sql
CREATE TABLE cases (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  slug        TEXT    NOT NULL UNIQUE,   -- URL識別子: 'debt-collection' 等
  title       TEXT    NOT NULL,          -- 表示名
  description TEXT,                     -- 説明
  color       TEXT    NOT NULL DEFAULT '#6366f1',  -- UIアクセントカラー（HEX）
  created_at  TEXT    NOT NULL DEFAULT (datetime('now', 'localtime')),
  updated_at  TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
);
```

**シードデータ**:

| id | slug | title | color |
|----|------|-------|-------|
| 1 | sample-case | サンプル案件 | #6366f1 |

初回起動時にはデモ用のサンプル案件が 1 件作成されます。実案件は UI から追加してください。

---

### documents（文書）

```sql
CREATE TABLE documents (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  case_id       INTEGER NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  title         TEXT    NOT NULL,            -- 表示用タイトル（ファイル名から自動生成）
  file_path     TEXT    NOT NULL,            -- 絶対ファイルパス（コピーしない）
  file_name     TEXT    NOT NULL,            -- ファイル名（拡張子付き）
  file_type     TEXT    NOT NULL DEFAULT 'other',  -- 'pdf'|'image'|'docx'|'text'|'other'
  mime_type     TEXT,                        -- MIMEタイプ
  file_size     INTEGER DEFAULT 0,           -- バイト数
  ocr_text      TEXT,                        -- OCR抽出テキスト（NULLは未実行）
  ocr_status    TEXT    NOT NULL DEFAULT 'pending',  -- 'pending'|'running'|'done'|'error'
  ocr_error     TEXT,                        -- OCRエラーメッセージ
  summary_text  TEXT,                        -- AI要約テキスト（NULLは未生成）
  summary_at    TEXT,                        -- 要約生成日時
  tags          TEXT    NOT NULL DEFAULT '[]',  -- JSON配列: ["証拠","契約書"]
  is_bookmarked INTEGER NOT NULL DEFAULT 0,  -- 0|1
  imported_at   TEXT    NOT NULL DEFAULT (datetime('now', 'localtime')),
  updated_at    TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
);
```

**file_type の値**:

| 値 | 対応MIMEタイプ |
|----|---------------|
| `pdf` | application/pdf |
| `image` | image/png, image/jpeg, image/gif, image/webp, image/tiff, image/bmp |
| `docx` | application/vnd.openxmlformats-officedocument.wordprocessingml.document |
| `text` | text/plain, text/csv |
| `other` | その他 |

---

### notes（メモ）

```sql
CREATE TABLE notes (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  case_id     INTEGER NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  document_id INTEGER REFERENCES documents(id) ON DELETE SET NULL,  -- 文書紐付け（任意）
  title       TEXT    NOT NULL DEFAULT '',
  body        TEXT    NOT NULL DEFAULT '',
  tags        TEXT    NOT NULL DEFAULT '[]',  -- JSON配列
  is_pinned   INTEGER NOT NULL DEFAULT 0,    -- 0|1
  created_at  TEXT    NOT NULL DEFAULT (datetime('now', 'localtime')),
  updated_at  TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
);
```

---

### bookmarks（ブックマーク）

```sql
CREATE TABLE bookmarks (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  case_id     INTEGER NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  comment     TEXT,           -- 任意のコメント
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now', 'localtime')),
  UNIQUE(case_id, document_id)
);
```

---

### search_history（検索履歴）

```sql
CREATE TABLE search_history (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  case_id      INTEGER REFERENCES cases(id) ON DELETE CASCADE,  -- NULLは全案件
  query        TEXT    NOT NULL,
  result_count INTEGER,
  searched_at  TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
);
```

---

### settings（設定）

```sql
CREATE TABLE settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,    -- JSON エンコードされた値
  updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);
```

**初期設定値**:

| key | value（JSON） | 説明 |
|-----|--------------|------|
| `gemini_api_key` | `""` | Gemini APIキー |
| `gemini_model` | `"gemini-1.5-flash"` | 使用モデル |
| `ocr_language` | `"jpn"` | OCR言語 |
| `app_theme` | `"light"` | テーマ |

---

### ai_conversations（AI会話履歴）

```sql
CREATE TABLE ai_conversations (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  case_id     INTEGER NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  document_id INTEGER REFERENCES documents(id) ON DELETE CASCADE,  -- NULLは案件レベル
  role        TEXT NOT NULL,    -- 'user' | 'model'
  content     TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);
```

---

## IPC API 仕様

フロントエンド（React）からバックエンド（Electron Main）への通信はすべて `window.api` を通じて行います。

### Cases

```typescript
window.api.cases.list()                        // → Case[]
window.api.cases.get(id: number)               // → Case
window.api.cases.update(id, data)              // → Case
```

### Documents

```typescript
window.api.documents.list(caseId, filter?)     // → Document[]
window.api.documents.get(id)                   // → Document
window.api.documents.import(caseId, paths[])   // → Document[]
window.api.documents.importZip(caseId, path)   // → Document[]
window.api.documents.importFolder(caseId, path) // → Document[]
window.api.documents.delete(id)                // → void
window.api.documents.update(id, data)          // → Document
window.api.documents.saveOcr(id, text)         // → Document
window.api.documents.saveSummary(id, text)     // → Document
window.api.documents.setBookmark(id, bool)     // → void
```

### File System

```typescript
window.api.fs.readFile(path)     // → { data: ArrayBuffer, mimeType: string }
window.api.fs.openDialog(filters, props)  // → string[]
window.api.fs.folderDialog()     // → string | null
window.api.fs.fileExists(path)   // → boolean
window.api.fs.showInFinder(path) // → void
```

### Notes & Bookmarks

```typescript
window.api.notes.list(caseId, docId?)   // → Note[]
window.api.notes.create(payload)        // → Note
window.api.notes.update(id, data)       // → Note
window.api.notes.delete(id)             // → void
window.api.bookmarks.list(caseId)       // → Bookmark[]
window.api.bookmarks.reorder(ids)       // → void
```

### Search

```typescript
window.api.search.ftsQuery(query, caseId?, limit?)  // → SearchResult[]
window.api.search.log(query, count, caseId?)        // → void
window.api.search.recommendations(caseId?, limit?)  // → string[]
window.api.search.history(caseId?, limit?)          // → SearchHistoryRow[]
```

### Settings

```typescript
window.api.settings.get(key)           // → unknown
window.api.settings.set(key, value)    // → void
window.api.settings.getAll()           // → Record<string, unknown>
```

### Shell & AI

```typescript
window.api.shell.copyText(text)        // → void
window.api.shell.openExternal(url)     // → void
window.api.shell.print(html, title?)   // → void
window.api.ai.saveMessage(caseId, docId, role, content)  // → AIMessage
window.api.ai.getHistory(caseId, docId?)                 // → AIMessage[]
window.api.ai.clearHistory(caseId, docId?)               // → void
```

---

## 外部API仕様

### Google Gemini API

| 項目 | 値 |
|------|-----|
| エンドポイント | `https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent` |
| 認証 | クエリパラメータ `?key={apiKey}` |
| メソッド | POST |
| Content-Type | `application/json` |

**リクエスト形式**:

```json
{
  "contents": [
    { "role": "user", "parts": [{ "text": "質問テキスト" }] }
  ],
  "generationConfig": {
    "temperature": 0.3,
    "maxOutputTokens": 8192
  }
}
```

**対応モデル**:

| モデルID | 特徴 |
|---------|------|
| `gemini-1.5-flash` | 高速・無料枠大（推奨） |
| `gemini-1.5-pro` | 高精度 |
| `gemini-2.0-flash` | 最新 |

---

### e-gov 法令API v2

| 項目 | 値 |
|------|-----|
| ベースURL | `https://laws.e-gov.go.jp/api/2` |
| 認証 | 不要（公開API） |
| レート制限 | 公式ドキュメント参照 |
| Swagger UI | `https://laws.e-gov.go.jp/api/2/swagger-ui` |

**使用エンドポイント**:

| エンドポイント | 説明 |
|--------------|------|
| `GET /laws?keyword={keyword}` | キーワードで法令を検索 |
| `GET /law_data/{lawId}` | 法令の条文をXMLで取得 |

---

## TypeScript 型定義

```typescript
// src/renderer/src/types/index.ts 参照

interface Case {
  id: number; slug: string; title: string;
  description: string | null; color: string;
  created_at: string; updated_at: string;
}

interface Document {
  id: number; case_id: number; title: string;
  file_path: string; file_name: string;
  file_type: 'pdf' | 'image' | 'docx' | 'text' | 'other';
  mime_type: string | null; file_size: number;
  ocr_text: string | null; ocr_status: 'pending' | 'running' | 'done' | 'error';
  summary_text: string | null; tags: string;
  is_bookmarked: number; imported_at: string; updated_at: string;
}

interface Note {
  id: number; case_id: number; document_id: number | null;
  title: string; body: string; tags: string;
  is_pinned: number; created_at: string; updated_at: string;
}

interface AIMessage {
  id: number; case_id: number; document_id: number | null;
  role: 'user' | 'model'; content: string; created_at: string;
}
```
