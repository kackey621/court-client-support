import { ipcMain } from 'electron'
import { getDb } from '../db'

export function registerActivityIpc(): void {
  // ドキュメント単位のアクティビティ
  ipcMain.handle(
    'activity:list-document',
    (_, { documentId, limit }: { documentId: number; limit?: number }) => {
      const db = getDb()
      return db
        .prepare(
          `SELECT * FROM document_activity WHERE document_id = ?
           ORDER BY created_at DESC LIMIT ?`
        )
        .all(documentId, limit ?? 50)
    }
  )

  // 案件全体のアクティビティ（ドキュメントタイトルを結合）
  ipcMain.handle(
    'activity:list-case',
    (_, { caseId, limit }: { caseId: number; limit?: number }) => {
      const db = getDb()
      return db
        .prepare(
          `SELECT a.*, d.title as doc_title
           FROM document_activity a
           JOIN documents d ON d.id = a.document_id
           WHERE a.case_id = ?
           ORDER BY a.created_at DESC LIMIT ?`
        )
        .all(caseId, limit ?? 100)
    }
  )
}
