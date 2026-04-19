import { ipcMain } from 'electron'
import { getDb } from '../db'

export function registerNotesIpc(): void {
  ipcMain.handle(
    'notes:list',
    (_, { caseId, documentId }: { caseId: number; documentId?: number }) => {
      const db = getDb()
      if (documentId != null) {
        return db
          .prepare(
            'SELECT * FROM notes WHERE case_id = ? AND document_id = ? ORDER BY is_pinned DESC, updated_at DESC'
          )
          .all(caseId, documentId)
      }
      return db
        .prepare(
          'SELECT * FROM notes WHERE case_id = ? ORDER BY is_pinned DESC, updated_at DESC'
        )
        .all(caseId)
    }
  )

  ipcMain.handle('notes:get', (_, id: number) => {
    const db = getDb()
    return db.prepare('SELECT * FROM notes WHERE id = ?').get(id)
  })

  ipcMain.handle(
    'notes:create',
    (
      _,
      payload: {
        caseId: number
        documentId?: number
        title: string
        body: string
        tags: string[]
      }
    ) => {
      const db = getDb()
      const result = db
        .prepare(
          'INSERT INTO notes (case_id, document_id, title, body, tags) VALUES (?, ?, ?, ?, ?)'
        )
        .run(
          payload.caseId,
          payload.documentId ?? null,
          payload.title,
          payload.body,
          JSON.stringify(payload.tags ?? [])
        )
      return db.prepare('SELECT * FROM notes WHERE id = ?').get(result.lastInsertRowid)
    }
  )

  ipcMain.handle(
    'notes:update',
    (_, { id, data }: { id: number; data: Record<string, unknown> }) => {
      const db = getDb()
      const allowed = ['title', 'body', 'tags', 'is_pinned']
      const fields = Object.keys(data).filter((k) => allowed.includes(k))
      if (fields.length === 0) return db.prepare('SELECT * FROM notes WHERE id = ?').get(id)

      const values = fields.map((f) => {
        if (f === 'tags' && Array.isArray(data[f])) return JSON.stringify(data[f])
        return data[f]
      })
      const set = fields.map((f) => `${f} = ?`).join(', ')
      db.prepare(
        `UPDATE notes SET ${set}, updated_at = datetime('now','localtime') WHERE id = ?`
      ).run(...values, id)
      return db.prepare('SELECT * FROM notes WHERE id = ?').get(id)
    }
  )

  ipcMain.handle('notes:delete', (_, id: number) => {
    const db = getDb()
    db.prepare('DELETE FROM notes WHERE id = ?').run(id)
  })

  ipcMain.handle('bookmarks:list', (_, { caseId }: { caseId: number }) => {
    const db = getDb()
    return db
      .prepare(
        `SELECT b.*, d.title as doc_title, d.file_type, d.file_path
         FROM bookmarks b
         JOIN documents d ON d.id = b.document_id
         WHERE b.case_id = ?
         ORDER BY b.sort_order ASC, b.created_at DESC`
      )
      .all(caseId)
  })

  ipcMain.handle('bookmarks:reorder', (_, { ids }: { ids: number[] }) => {
    const db = getDb()
    db.transaction(() => {
      ids.forEach((id, idx) => {
        db.prepare('UPDATE bookmarks SET sort_order = ? WHERE id = ?').run(idx, id)
      })
    })()
  })
}
