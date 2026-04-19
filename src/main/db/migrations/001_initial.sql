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
