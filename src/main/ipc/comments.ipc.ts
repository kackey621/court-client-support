import { ipcMain } from 'electron'
import { getDb } from '../db'
import { logActivity } from './activityLogger'

export function registerCommentsIpc(): void {
  // 一覧取得
  ipcMain.handle('comments:list', (_, { documentId }: { documentId: number }) => {
    const db = getDb()
    return db
      .prepare(
        `SELECT * FROM document_comments WHERE document_id = ?
         ORDER BY is_resolved ASC, created_at DESC`
      )
      .all(documentId)
  })

  // 作成
  ipcMain.handle(
    'comments:create',
    (
      _,
      {
        documentId,
        caseId,
        content,
        pageRef
      }: { documentId: number; caseId: number; content: string; pageRef?: string }
    ) => {
      const db = getDb()
      const result = db
        .prepare(
          `INSERT INTO document_comments (document_id, case_id, content, page_ref) VALUES (?, ?, ?, ?)`
        )
        .run(documentId, caseId, content, pageRef ?? null)
      const comment = db
        .prepare('SELECT * FROM document_comments WHERE id = ?')
        .get(result.lastInsertRowid)
      logActivity(documentId, caseId, 'comment_add', `コメントを追加: ${content.slice(0, 40)}`)
      return comment
    }
  )

  // 更新
  ipcMain.handle(
    'comments:update',
    (_, { id, content }: { id: number; content: string }) => {
      const db = getDb()
      db.prepare(
        `UPDATE document_comments SET content = ?, updated_at = datetime('now','localtime') WHERE id = ?`
      ).run(content, id)
      return db.prepare('SELECT * FROM document_comments WHERE id = ?').get(id)
    }
  )

  // 削除
  ipcMain.handle('comments:delete', (_, { id }: { id: number }) => {
    const db = getDb()
    db.prepare('DELETE FROM document_comments WHERE id = ?').run(id)
  })

  // 解決/未解決トグル
  ipcMain.handle(
    'comments:resolve',
    (_, { id, resolved }: { id: number; resolved: boolean }) => {
      const db = getDb()
      db.prepare(
        `UPDATE document_comments SET is_resolved = ?, updated_at = datetime('now','localtime') WHERE id = ?`
      ).run(resolved ? 1 : 0, id)
      const comment = db.prepare('SELECT * FROM document_comments WHERE id = ?').get(id) as {
        document_id: number; case_id: number
      }
      if (comment) {
        logActivity(
          comment.document_id,
          comment.case_id,
          resolved ? 'comment_resolve' : 'comment_reopen',
          resolved ? 'コメントを解決済みにしました' : 'コメントを未解決に戻しました'
        )
      }
      return db.prepare('SELECT * FROM document_comments WHERE id = ?').get(id)
    }
  )
}
