import { ipcMain } from 'electron'
import { getDb } from '../db'
import { getFileInfo, scanFolder, extractZip } from '../services/fileService'
import { basename, extname } from 'path'
import { logActivity } from './activityLogger'
import { enqueueOcr } from '../services/ocrQueue'

interface ImportedDoc {
  id: number
  file_type: string
}

/** インポート直後に OCR 対象を自動キュー投入 */
function autoEnqueueOcr(results: ImportedDoc[]): void {
  for (const r of results) {
    if (r.file_type === 'pdf' || r.file_type === 'image') {
      enqueueOcr(r.id)
    }
  }
}

export function registerDocumentsIpc(): void {
  ipcMain.handle(
    'documents:list',
    (_, { caseId, filter }: { caseId: number; filter?: Record<string, unknown> }) => {
      const db = getDb()
      let sql = 'SELECT * FROM documents WHERE case_id = ?'
      const params: unknown[] = [caseId]

      if (filter?.fileType) {
        sql += ' AND file_type = ?'
        params.push(filter.fileType)
      }
      if (filter?.isBookmarked) {
        sql += ' AND is_bookmarked = 1'
      }
      if (filter?.ocrStatus) {
        sql += ' AND ocr_status = ?'
        params.push(filter.ocrStatus)
      }
      if (filter?.docCategory) {
        sql += ' AND doc_category = ?'
        params.push(filter.docCategory)
      }
      if (filter?.sectionId !== undefined) {
        if (filter.sectionId === null) {
          sql += ' AND section_id IS NULL'
        } else {
          sql += ' AND section_id = ?'
          params.push(filter.sectionId)
        }
      }

      sql += ' ORDER BY imported_at DESC'
      return db.prepare(sql).all(...params)
    }
  )

  ipcMain.handle('documents:get', (_, id: number) => {
    const db = getDb()
    return db.prepare('SELECT * FROM documents WHERE id = ?').get(id)
  })

  ipcMain.handle(
    'documents:import',
    (_, { caseId, filePaths }: { caseId: number; filePaths: string[] }) => {
      const db = getDb()
      const insert = db.prepare(`
        INSERT INTO documents (case_id, title, file_path, file_name, file_type, mime_type, file_size)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `)

      const results: unknown[] = []
      db.transaction(() => {
        for (const fp of filePaths) {
          const info = getFileInfo(fp)
          const title = basename(fp, extname(fp))
          const result = insert.run(
            caseId,
            title,
            info.filePath,
            info.fileName,
            info.fileType,
            info.mimeType,
            info.fileSize
          )
          results.push(
            db.prepare('SELECT * FROM documents WHERE id = ?').get(result.lastInsertRowid)
          )
          // アクティビティログ
          logActivity(
            result.lastInsertRowid as number,
            caseId,
            'import',
            `ファイルをインポート: ${info.fileName}`
          )
        }
      })()
      autoEnqueueOcr(results as ImportedDoc[])
      return results
    }
  )

  ipcMain.handle(
    'documents:import-zip',
    (_, { caseId, zipPath }: { caseId: number; zipPath: string }) => {
      const files = extractZip(zipPath)
      const db = getDb()
      const insert = db.prepare(`
        INSERT INTO documents (case_id, title, file_path, file_name, file_type, mime_type, file_size)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `)
      const results: unknown[] = []
      db.transaction(() => {
        for (const info of files) {
          const title = basename(info.filePath, extname(info.filePath))
          const result = insert.run(
            caseId,
            title,
            info.filePath,
            info.fileName,
            info.fileType,
            info.mimeType,
            info.fileSize
          )
          results.push(
            db.prepare('SELECT * FROM documents WHERE id = ?').get(result.lastInsertRowid)
          )
          logActivity(
            result.lastInsertRowid as number,
            caseId,
            'import',
            `ZIP からインポート: ${info.fileName}`
          )
        }
      })()
      autoEnqueueOcr(results as ImportedDoc[])
      return results
    }
  )

  ipcMain.handle(
    'documents:import-folder',
    (_, { caseId, folderPath }: { caseId: number; folderPath: string }) => {
      const files = scanFolder(folderPath)
      const db = getDb()
      const insert = db.prepare(`
        INSERT INTO documents (case_id, title, file_path, file_name, file_type, mime_type, file_size)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `)
      const results: unknown[] = []
      db.transaction(() => {
        for (const info of files) {
          const title = basename(info.filePath, extname(info.filePath))
          const result = insert.run(
            caseId,
            title,
            info.filePath,
            info.fileName,
            info.fileType,
            info.mimeType,
            info.fileSize
          )
          results.push(
            db.prepare('SELECT * FROM documents WHERE id = ?').get(result.lastInsertRowid)
          )
          logActivity(
            result.lastInsertRowid as number,
            caseId,
            'import',
            `フォルダからインポート: ${info.fileName}`
          )
        }
      })()
      autoEnqueueOcr(results as ImportedDoc[])
      return results
    }
  )

  ipcMain.handle('documents:delete', (_, id: number) => {
    const db = getDb()
    db.prepare('DELETE FROM documents WHERE id = ?').run(id)
  })

  ipcMain.handle(
    'documents:update',
    (_, { id, data }: { id: number; data: Record<string, unknown> }) => {
      const db = getDb()
      const allowed = ['title', 'tags', 'is_bookmarked']
      const fields = Object.keys(data).filter((k) => allowed.includes(k))
      if (fields.length === 0) return db.prepare('SELECT * FROM documents WHERE id = ?').get(id)

      const set = fields.map((f) => `${f} = ?`).join(', ')
      const values = fields.map((f) => data[f])
      db.prepare(
        `UPDATE documents SET ${set}, updated_at = datetime('now','localtime') WHERE id = ?`
      ).run(...values, id)
      return db.prepare('SELECT * FROM documents WHERE id = ?').get(id)
    }
  )

  ipcMain.handle(
    'documents:save-ocr',
    (_, { id, ocrText }: { id: number; ocrText: string }) => {
      const db = getDb()
      db.prepare(
        `UPDATE documents SET ocr_text = ?, ocr_status = 'done', updated_at = datetime('now','localtime') WHERE id = ?`
      ).run(ocrText, id)
      const doc = db.prepare('SELECT case_id FROM documents WHERE id = ?').get(id) as { case_id: number } | undefined
      if (doc) logActivity(id, doc.case_id, 'ocr_done', 'OCRテキストを保存しました')
      return db.prepare('SELECT * FROM documents WHERE id = ?').get(id)
    }
  )

  ipcMain.handle(
    'documents:save-summary',
    (_, { id, summaryText }: { id: number; summaryText: string }) => {
      const db = getDb()
      db.prepare(
        `UPDATE documents SET summary_text = ?, summary_at = datetime('now','localtime'), updated_at = datetime('now','localtime') WHERE id = ?`
      ).run(summaryText, id)
      const doc2 = db.prepare('SELECT case_id FROM documents WHERE id = ?').get(id) as { case_id: number } | undefined
      if (doc2) logActivity(id, doc2.case_id, 'summary_done', 'AI要約を生成・保存しました')
      return db.prepare('SELECT * FROM documents WHERE id = ?').get(id)
    }
  )

  ipcMain.handle(
    'documents:set-bookmark',
    (
      _,
      {
        id,
        bookmarked,
        comment
      }: { id: number; bookmarked: boolean; comment?: string }
    ) => {
      const db = getDb()
      db.prepare(
        `UPDATE documents SET is_bookmarked = ?, updated_at = datetime('now','localtime') WHERE id = ?`
      ).run(bookmarked ? 1 : 0, id)

      const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(id) as {
        case_id: number
      }
      if (bookmarked) {
        db.prepare(
          'INSERT OR IGNORE INTO bookmarks (case_id, document_id, comment) VALUES (?, ?, ?)'
        ).run(doc.case_id, id, comment || null)
      } else {
        db.prepare('DELETE FROM bookmarks WHERE document_id = ?').run(id)
      }
    }
  )

  ipcMain.handle(
    'documents:set-wiki',
    (_, { id, content }: { id: number; content: string }) => {
      const db = getDb()
      db.prepare(
        `UPDATE documents SET wiki_content = ?, updated_at = datetime('now','localtime') WHERE id = ?`
      ).run(content, id)
      const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(id) as { case_id: number } & Record<string, unknown>
      if (doc) logActivity(id, doc.case_id, 'wiki_edit', 'Wikiコンテンツを編集しました')
      return doc
    }
  )
}
