import { ipcMain } from 'electron'
import { getDb } from '../db'

export function registerSearchIpc(): void {
  ipcMain.handle(
    'search:fts-query',
    (
      _,
      {
        query,
        caseId,
        limit = 50
      }: { query: string; caseId?: number; limit?: number }
    ) => {
      const db = getDb()

      const ftsQuery = query
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map((t) => `"${t}"*`)
        .join(' ')

      if (!ftsQuery) return []

      if (caseId != null) {
        return db
          .prepare(
            `SELECT d.*, snippet(documents_fts, 1, '<mark>', '</mark>', '...', 20) as snippet
             FROM documents_fts f
             JOIN documents d ON d.id = f.rowid
             WHERE f.documents_fts MATCH ? AND d.case_id = ?
             ORDER BY rank
             LIMIT ?`
          )
          .all(ftsQuery, caseId, limit)
      }

      return db
        .prepare(
          `SELECT d.*, snippet(documents_fts, 1, '<mark>', '</mark>', '...', 20) as snippet
           FROM documents_fts f
           JOIN documents d ON d.id = f.rowid
           WHERE f.documents_fts MATCH ?
           ORDER BY rank
           LIMIT ?`
        )
        .all(ftsQuery, limit)
    }
  )

  ipcMain.handle(
    'search:log',
    (
      _,
      {
        query,
        resultCount,
        caseId
      }: { query: string; resultCount: number; caseId?: number }
    ) => {
      const db = getDb()
      db.prepare(
        'INSERT INTO search_history (case_id, query, result_count) VALUES (?, ?, ?)'
      ).run(caseId ?? null, query, resultCount)
    }
  )

  ipcMain.handle(
    'search:recommendations',
    (_, { caseId, limit = 10 }: { caseId?: number; limit?: number }) => {
      const db = getDb()
      let rows: { query: string }[]

      if (caseId != null) {
        rows = db
          .prepare(
            `SELECT query, COUNT(*) as freq
             FROM search_history
             WHERE case_id = ?
             GROUP BY query
             ORDER BY freq DESC, searched_at DESC
             LIMIT ?`
          )
          .all(caseId, limit) as { query: string }[]
      } else {
        rows = db
          .prepare(
            `SELECT query, COUNT(*) as freq
             FROM search_history
             GROUP BY query
             ORDER BY freq DESC, searched_at DESC
             LIMIT ?`
          )
          .all(limit) as { query: string }[]
      }

      return rows.map((r) => r.query)
    }
  )

  ipcMain.handle(
    'search:history',
    (_, { caseId, limit = 20 }: { caseId?: number; limit?: number }) => {
      const db = getDb()
      if (caseId != null) {
        return db
          .prepare(
            'SELECT * FROM search_history WHERE case_id = ? ORDER BY searched_at DESC LIMIT ?'
          )
          .all(caseId, limit)
      }
      return db
        .prepare('SELECT * FROM search_history ORDER BY searched_at DESC LIMIT ?')
        .all(limit)
    }
  )
}
