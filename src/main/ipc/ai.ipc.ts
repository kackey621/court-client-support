import { ipcMain } from 'electron'
import { getDb } from '../db'

export function registerAiIpc(): void {
  ipcMain.handle(
    'ai:save-message',
    (
      _,
      {
        caseId,
        documentId,
        role,
        content
      }: { caseId: number; documentId: number | null; role: string; content: string }
    ) => {
      const db = getDb()
      const result = db
        .prepare(
          'INSERT INTO ai_conversations (case_id, document_id, role, content) VALUES (?, ?, ?, ?)'
        )
        .run(caseId, documentId ?? null, role, content)
      return db
        .prepare('SELECT * FROM ai_conversations WHERE id = ?')
        .get(result.lastInsertRowid)
    }
  )

  ipcMain.handle(
    'ai:get-history',
    (_, { caseId, documentId }: { caseId: number; documentId?: number }) => {
      const db = getDb()
      if (documentId != null) {
        return db
          .prepare(
            'SELECT * FROM ai_conversations WHERE case_id = ? AND document_id = ? ORDER BY created_at ASC'
          )
          .all(caseId, documentId)
      }
      return db
        .prepare(
          'SELECT * FROM ai_conversations WHERE case_id = ? AND document_id IS NULL ORDER BY created_at ASC'
        )
        .all(caseId)
    }
  )

  ipcMain.handle(
    'ai:clear-history',
    (_, { caseId, documentId }: { caseId: number; documentId?: number }) => {
      const db = getDb()
      if (documentId != null) {
        db.prepare(
          'DELETE FROM ai_conversations WHERE case_id = ? AND document_id = ?'
        ).run(caseId, documentId)
      } else {
        db.prepare(
          'DELETE FROM ai_conversations WHERE case_id = ? AND document_id IS NULL'
        ).run(caseId)
      }
    }
  )
}
