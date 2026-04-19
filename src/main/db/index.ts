import Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'path'
import { mkdirSync } from 'fs'

let db: Database.Database | null = null

const MIGRATIONS: { name: string; sql: string }[] = [
  {
    name: '001_initial',
    sql: `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS cases (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  slug        TEXT    NOT NULL UNIQUE,
  title       TEXT    NOT NULL,
  description TEXT,
  color       TEXT    NOT NULL DEFAULT '#6366f1',
  created_at  TEXT    NOT NULL DEFAULT (datetime('now', 'localtime')),
  updated_at  TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS documents (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  case_id       INTEGER NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  title         TEXT    NOT NULL,
  file_path     TEXT    NOT NULL,
  file_name     TEXT    NOT NULL,
  file_type     TEXT    NOT NULL DEFAULT 'other',
  mime_type     TEXT,
  file_size     INTEGER DEFAULT 0,
  ocr_text      TEXT,
  ocr_status    TEXT    NOT NULL DEFAULT 'pending',
  ocr_error     TEXT,
  summary_text  TEXT,
  summary_at    TEXT,
  tags          TEXT    NOT NULL DEFAULT '[]',
  is_bookmarked INTEGER NOT NULL DEFAULT 0,
  imported_at   TEXT    NOT NULL DEFAULT (datetime('now', 'localtime')),
  updated_at    TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE INDEX IF NOT EXISTS idx_documents_case_id ON documents(case_id);
CREATE INDEX IF NOT EXISTS idx_documents_file_type ON documents(file_type);
CREATE INDEX IF NOT EXISTS idx_documents_is_bookmarked ON documents(is_bookmarked);

CREATE VIRTUAL TABLE IF NOT EXISTS documents_fts USING fts5(
  title,
  ocr_text,
  summary_text,
  tags,
  content='documents',
  content_rowid='id'
);

CREATE TRIGGER IF NOT EXISTS documents_ai AFTER INSERT ON documents BEGIN
  INSERT INTO documents_fts(rowid, title, ocr_text, summary_text, tags)
  VALUES (new.id, new.title, new.ocr_text, new.summary_text, new.tags);
END;

CREATE TRIGGER IF NOT EXISTS documents_au AFTER UPDATE ON documents BEGIN
  INSERT INTO documents_fts(documents_fts, rowid, title, ocr_text, summary_text, tags)
  VALUES ('delete', old.id, old.title, old.ocr_text, old.summary_text, old.tags);
  INSERT INTO documents_fts(rowid, title, ocr_text, summary_text, tags)
  VALUES (new.id, new.title, new.ocr_text, new.summary_text, new.tags);
END;

CREATE TRIGGER IF NOT EXISTS documents_ad AFTER DELETE ON documents BEGIN
  INSERT INTO documents_fts(documents_fts, rowid, title, ocr_text, summary_text, tags)
  VALUES ('delete', old.id, old.title, old.ocr_text, old.summary_text, old.tags);
END;
    `
  },
  {
    name: '002_notes',
    sql: `
CREATE TABLE IF NOT EXISTS notes (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  case_id     INTEGER NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  document_id INTEGER REFERENCES documents(id) ON DELETE SET NULL,
  title       TEXT    NOT NULL DEFAULT '',
  body        TEXT    NOT NULL DEFAULT '',
  tags        TEXT    NOT NULL DEFAULT '[]',
  is_pinned   INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now', 'localtime')),
  updated_at  TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE INDEX IF NOT EXISTS idx_notes_case_id     ON notes(case_id);
CREATE INDEX IF NOT EXISTS idx_notes_document_id ON notes(document_id);

CREATE TABLE IF NOT EXISTS bookmarks (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  case_id     INTEGER NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  comment     TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now', 'localtime')),
  UNIQUE(case_id, document_id)
);

CREATE INDEX IF NOT EXISTS idx_bookmarks_case_id ON bookmarks(case_id);
    `
  },
  {
    name: '003_search_cache',
    sql: `
CREATE TABLE IF NOT EXISTS search_history (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  case_id      INTEGER REFERENCES cases(id) ON DELETE CASCADE,
  query        TEXT    NOT NULL,
  result_count INTEGER,
  searched_at  TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE INDEX IF NOT EXISTS idx_search_history_case_id ON search_history(case_id);

CREATE TABLE IF NOT EXISTS settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS ai_conversations (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  case_id     INTEGER NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  document_id INTEGER REFERENCES documents(id) ON DELETE CASCADE,
  role        TEXT NOT NULL,
  content     TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE INDEX IF NOT EXISTS idx_ai_conversations_case_doc
  ON ai_conversations(case_id, document_id);
    `
  },
  {
    name: '005_auth',
    sql: `
-- 認証設定（既存 settings テーブルを流用）
INSERT OR IGNORE INTO settings (key, value) VALUES ('auth_method', '"none"');
INSERT OR IGNORE INTO settings (key, value) VALUES ('is_first_run', 'true');
INSERT OR IGNORE INTO settings (key, value) VALUES ('auto_lock_minutes', '5');
    `
  },
  {
    name: '006_comments_wiki_activity',
    sql: `
-- コメントテーブル
CREATE TABLE IF NOT EXISTS document_comments (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  case_id     INTEGER NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  content     TEXT    NOT NULL,
  page_ref    TEXT,
  is_resolved INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
  updated_at  TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
);
CREATE INDEX IF NOT EXISTS idx_comments_document_id ON document_comments(document_id);
CREATE INDEX IF NOT EXISTS idx_comments_case_id ON document_comments(case_id);

-- アクティビティログテーブル
CREATE TABLE IF NOT EXISTS document_activity (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  case_id     INTEGER NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  event_type  TEXT    NOT NULL,
  description TEXT    NOT NULL,
  metadata    TEXT,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
);
CREATE INDEX IF NOT EXISTS idx_activity_document_id ON document_activity(document_id);
CREATE INDEX IF NOT EXISTS idx_activity_case_id     ON document_activity(case_id);

-- Wiki コンテンツカラム（ドキュメントごとのMarkdown編集エリア）
ALTER TABLE documents ADD COLUMN wiki_content TEXT;
    `
  },
  {
    name: '004_sections',
    sql: `
-- ────────────────────────────────────────────────
-- セクション（フォルダ）テーブル：ドキュメントを階層整理する
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sections (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  case_id    INTEGER NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  parent_id  INTEGER REFERENCES sections(id) ON DELETE CASCADE,
  name       TEXT    NOT NULL,
  icon       TEXT    NOT NULL DEFAULT 'folder',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT    NOT NULL DEFAULT (datetime('now', 'localtime')),
  updated_at TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE INDEX IF NOT EXISTS idx_sections_case_id   ON sections(case_id);
CREATE INDEX IF NOT EXISTS idx_sections_parent_id ON sections(parent_id);

-- ────────────────────────────────────────────────
-- documents 拡張カラム
-- ────────────────────────────────────────────────
-- セクション帰属
ALTER TABLE documents ADD COLUMN section_id INTEGER REFERENCES sections(id) ON DELETE SET NULL;

-- Notion 風の子ページ関係
ALTER TABLE documents ADD COLUMN parent_doc_id INTEGER REFERENCES documents(id) ON DELETE SET NULL;

-- 文書カテゴリ: evidence（証拠）| working（作業文書）| reference（参考）
ALTER TABLE documents ADD COLUMN doc_category TEXT NOT NULL DEFAULT 'evidence';

-- ロックフラグ: 1=削除・上書き不可（証拠文書に設定）
ALTER TABLE documents ADD COLUMN is_locked INTEGER NOT NULL DEFAULT 0;

-- ────────────────────────────────────────────────
-- ピン留めナビゲーション（サイドバーに固定表示）
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pinned_nav (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  case_id     INTEGER NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now', 'localtime')),
  UNIQUE(case_id, document_id)
);

CREATE INDEX IF NOT EXISTS idx_pinned_nav_case_id ON pinned_nav(case_id);

-- ────────────────────────────────────────────────
-- gemini_model を最新の名称に更新
-- ────────────────────────────────────────────────
UPDATE settings
SET value = '"gemini-2.0-flash"', updated_at = datetime('now','localtime')
WHERE key = 'gemini_model' AND value = '"gemini-1.5-flash"';
    `
  }
]

export function getDb(): Database.Database {
  if (db) return db

  const userDataPath = app.getPath('userData')
  mkdirSync(userDataPath, { recursive: true })

  const dbPath = join(userDataPath, 'court-strategies.db')
  db = new Database(dbPath)

  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  runMigrations(db)
  runSeed(db)

  return db
}

function runMigrations(database: Database.Database): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      name TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    )
  `)

  for (const migration of MIGRATIONS) {
    const applied = database
      .prepare('SELECT name FROM _migrations WHERE name = ?')
      .get(migration.name)
    if (applied) continue
    database.exec(migration.sql)
    database.prepare('INSERT INTO _migrations (name) VALUES (?)').run(migration.name)
  }
}

function runSeed(database: Database.Database): void {
  const count = (
    database.prepare('SELECT COUNT(*) as c FROM cases').get() as { c: number }
  ).c
  if (count > 0) return

  const insertCase = database.prepare(
    'INSERT INTO cases (slug, title, description, color) VALUES (?, ?, ?, ?)'
  )
  const insertSettings = database.prepare(
    'INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)'
  )

  database.transaction(() => {
    insertCase.run(
      'sample-case',
      'サンプル案件',
      'はじめに作成されるデモ用の案件です。設定画面やサイドバーから案件を追加・編集してください。',
      '#6366f1'
    )

    insertSettings.run('gemini_api_key', JSON.stringify(''))
    insertSettings.run('gemini_model', JSON.stringify('gemini-2.0-flash'))
    insertSettings.run('ocr_language', JSON.stringify('jpn'))
    insertSettings.run('app_theme', JSON.stringify('light'))
  })()
}

export function closeDb(): void {
  if (db) {
    db.close()
    db = null
  }
}
