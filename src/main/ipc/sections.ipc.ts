import { ipcMain } from 'electron'
import { getDb } from '../db'
import { logActivity } from './activityLogger'

export function registerSectionsIpc(): void {
  // 案件のセクション一覧（ツリー構造）
  ipcMain.handle('sections:list', (_, { caseId }: { caseId: number }) => {
    const db = getDb()
    return db
      .prepare('SELECT * FROM sections WHERE case_id = ? ORDER BY parent_id ASC, sort_order ASC, name ASC')
      .all(caseId)
  })

  // セクション作成
  ipcMain.handle(
    'sections:create',
    (
      _,
      { caseId, name, parentId, icon }: { caseId: number; name: string; parentId?: number; icon?: string }
    ) => {
      const db = getDb()
      const result = db
        .prepare(
          'INSERT INTO sections (case_id, parent_id, name, icon) VALUES (?, ?, ?, ?)'
        )
        .run(caseId, parentId ?? null, name, icon ?? 'folder')
      return db.prepare('SELECT * FROM sections WHERE id = ?').get(result.lastInsertRowid)
    }
  )

  // セクション更新（名前・アイコン）
  ipcMain.handle(
    'sections:update',
    (_, { id, name, icon }: { id: number; name: string; icon?: string }) => {
      const db = getDb()
      db.prepare(
        `UPDATE sections SET name = ?, icon = COALESCE(?, icon), updated_at = datetime('now','localtime') WHERE id = ?`
      ).run(name, icon ?? null, id)
      return db.prepare('SELECT * FROM sections WHERE id = ?').get(id)
    }
  )

  // セクション削除（子セクションも cascade 削除、文書は uncategorized に）
  ipcMain.handle('sections:delete', (_, { id }: { id: number }) => {
    const db = getDb()
    // 子セクションに属する文書を uncategorized に
    db.prepare('UPDATE documents SET section_id = NULL WHERE section_id = ?').run(id)
    db.prepare('DELETE FROM sections WHERE id = ?').run(id)
  })

  // 文書のセクションを変更
  ipcMain.handle(
    'sections:move-document',
    (_, { documentId, sectionId }: { documentId: number; sectionId: number | null }) => {
      const db = getDb()
      db.prepare(
        `UPDATE documents SET section_id = ?, updated_at = datetime('now','localtime') WHERE id = ?`
      ).run(sectionId ?? null, documentId)
    }
  )

  // 文書の親文書を設定（Notion風子ページ）
  ipcMain.handle(
    'documents:set-parent',
    (_, { id, parentDocId }: { id: number; parentDocId: number | null }) => {
      const db = getDb()
      db.prepare(
        `UPDATE documents SET parent_doc_id = ?, updated_at = datetime('now','localtime') WHERE id = ?`
      ).run(parentDocId ?? null, id)
      return db.prepare('SELECT * FROM documents WHERE id = ?').get(id)
    }
  )

  // 文書ツリー（親なし = ルート）+ 子文書
  ipcMain.handle(
    'documents:tree',
    (_, { caseId, sectionId }: { caseId: number; sectionId?: number }) => {
      const db = getDb()
      if (sectionId != null) {
        return db
          .prepare(
            'SELECT * FROM documents WHERE case_id = ? AND section_id = ? ORDER BY imported_at DESC'
          )
          .all(caseId, sectionId)
      }
      return db
        .prepare(
          'SELECT * FROM documents WHERE case_id = ? AND section_id IS NULL ORDER BY imported_at DESC'
        )
        .all(caseId)
    }
  )

  // セクションの並び順を保存
  ipcMain.handle(
    'sections:reorder',
    (_, { orders }: { orders: { id: number; sort_order: number }[] }) => {
      const db = getDb()
      db.transaction(() => {
        for (const o of orders) {
          db.prepare('UPDATE sections SET sort_order = ? WHERE id = ?').run(o.sort_order, o.id)
        }
      })()
    }
  )

  // ────── ピン留めナビ ──────
  ipcMain.handle('pinned:list', (_, { caseId }: { caseId: number }) => {
    const db = getDb()
    return db
      .prepare(
        `SELECT p.*, d.title, d.file_type, d.file_path, d.doc_category, d.is_locked
         FROM pinned_nav p
         JOIN documents d ON d.id = p.document_id
         WHERE p.case_id = ?
         ORDER BY p.sort_order ASC, p.created_at ASC`
      )
      .all(caseId)
  })

  ipcMain.handle(
    'pinned:add',
    (_, { caseId, documentId }: { caseId: number; documentId: number }) => {
      const db = getDb()
      db.prepare(
        'INSERT OR IGNORE INTO pinned_nav (case_id, document_id) VALUES (?, ?)'
      ).run(caseId, documentId)
      const d = db.prepare('SELECT title FROM documents WHERE id = ?').get(documentId) as { title: string } | undefined
      if (d) logActivity(documentId, caseId, 'pin', `サイドバーにピン留め: ${d.title}`)
    }
  )

  ipcMain.handle(
    'pinned:remove',
    (_, { caseId, documentId }: { caseId: number; documentId: number }) => {
      const db = getDb()
      db.prepare(
        'DELETE FROM pinned_nav WHERE case_id = ? AND document_id = ?'
      ).run(caseId, documentId)
      logActivity(documentId, caseId, 'unpin', 'サイドバーのピンを外しました')
    }
  )

  ipcMain.handle(
    'pinned:reorder',
    (_, { orders }: { orders: { id: number; sort_order: number }[] }) => {
      const db = getDb()
      db.transaction(() => {
        for (const o of orders) {
          db.prepare('UPDATE pinned_nav SET sort_order = ? WHERE id = ?').run(o.sort_order, o.id)
        }
      })()
    }
  )

  // ────── 文書カテゴリ / ロック ──────
  ipcMain.handle(
    'documents:set-category',
    (
      _,
      {
        id,
        category,
        locked
      }: { id: number; category: string; locked?: boolean }
    ) => {
      const db = getDb()
      if (locked !== undefined) {
        db.prepare(
          `UPDATE documents SET doc_category = ?, is_locked = ?, updated_at = datetime('now','localtime') WHERE id = ?`
        ).run(category, locked ? 1 : 0, id)
      } else {
        db.prepare(
          `UPDATE documents SET doc_category = ?, updated_at = datetime('now','localtime') WHERE id = ?`
        ).run(category, id)
      }
      const updated = db.prepare('SELECT case_id FROM documents WHERE id = ?').get(id) as { case_id: number } | undefined
      if (updated) {
        logActivity(id, updated.case_id, 'category_change',
          `カテゴリを変更${locked !== undefined ? ' / ロック状態を変更' : ''}`)
      }
      return db.prepare('SELECT * FROM documents WHERE id = ?').get(id)
    }
  )
}
