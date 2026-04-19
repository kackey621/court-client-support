import { BrowserWindow } from 'electron'
import { getDb } from '../db'
import { runNdlOcr, isNdlOcrAvailable } from './ndlocrService'
import { logActivity } from '../ipc/activityLogger'

interface QueueRow {
  id: number
  file_path: string
  file_type: string
  case_id: number
}

const OCR_TARGET_TYPES = new Set(['pdf', 'image'])

let processing = false

function broadcast(channel: string, payload: unknown): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) win.webContents.send(channel, payload)
  }
}

/**
 * OCR 対象外のファイルタイプは done 相当にしてキューから除外。
 */
export function normalizeNonOcrable(): void {
  const db = getDb()
  db.prepare(
    `UPDATE documents
     SET ocr_status = 'done'
     WHERE ocr_status = 'pending' AND file_type NOT IN ('pdf', 'image')`
  ).run()
}

/**
 * 指定ドキュメントを pending に戻し、キュー処理を起動する。
 */
export function enqueueOcr(documentId: number): void {
  const db = getDb()
  db.prepare(
    `UPDATE documents
     SET ocr_status = 'pending', ocr_error = NULL, updated_at = datetime('now','localtime')
     WHERE id = ? AND file_type IN ('pdf', 'image')`
  ).run(documentId)
  void processQueue()
}

/**
 * pending の文書を 1 件ずつ処理する。
 * 多重起動されないよう processing フラグで直列化。
 */
export async function processQueue(): Promise<void> {
  if (processing) return
  processing = true

  try {
    while (true) {
      const db = getDb()
      const row = db
        .prepare(
          `SELECT id, file_path, file_type, case_id
           FROM documents
           WHERE ocr_status = 'pending' AND file_type IN ('pdf', 'image')
           ORDER BY imported_at ASC
           LIMIT 1`
        )
        .get() as QueueRow | undefined

      if (!row) break

      if (!isNdlOcrAvailable()) {
        db.prepare(
          `UPDATE documents SET ocr_status = 'error', ocr_error = ? WHERE id = ?`
        ).run('NDLOCR-Lite バイナリが見つかりません (scripts/build-ndlocr.sh)', row.id)
        broadcast('ocr:status', {
          docId: row.id,
          status: 'error',
          error: 'NDLOCR-Lite 未セットアップ'
        })
        continue
      }

      if (!OCR_TARGET_TYPES.has(row.file_type)) {
        db.prepare(`UPDATE documents SET ocr_status = 'done' WHERE id = ?`).run(row.id)
        continue
      }

      db.prepare(
        `UPDATE documents SET ocr_status = 'running', ocr_error = NULL WHERE id = ?`
      ).run(row.id)
      broadcast('ocr:status', { docId: row.id, status: 'running', progress: 0 })

      try {
        const result = await runNdlOcr(row.file_path, 'jpn', (ev) => {
          broadcast('ocr:progress', {
            docId: row.id,
            progress: ev.progress,
            message: ev.message,
            status: ev.status
          })
        })

        db.prepare(
          `UPDATE documents
           SET ocr_text = ?, ocr_status = 'done', ocr_error = NULL,
               updated_at = datetime('now','localtime')
           WHERE id = ?`
        ).run(result.text, row.id)

        logActivity(
          row.id,
          row.case_id,
          'ocr_done',
          `NDLOCR-Lite でテキスト抽出 (${result.pages.length} ページ)`
        )
        broadcast('ocr:status', {
          docId: row.id,
          status: 'done',
          textLength: result.text.length,
          pages: result.pages.length
        })
      } catch (e) {
        const msg = (e as Error).message
        db.prepare(
          `UPDATE documents SET ocr_status = 'error', ocr_error = ? WHERE id = ?`
        ).run(msg, row.id)
        logActivity(row.id, row.case_id, 'ocr_error', `OCR 失敗: ${msg}`)
        broadcast('ocr:status', { docId: row.id, status: 'error', error: msg })
      }
    }
  } finally {
    processing = false
  }
}

/**
 * アプリ起動時に未完了の OCR を再開する。
 * running 状態で残っているものは pending へ戻す (前回クラッシュ対策)。
 */
export function resumePendingOnStartup(): void {
  const db = getDb()
  db.prepare(
    `UPDATE documents SET ocr_status = 'pending' WHERE ocr_status = 'running'`
  ).run()
  normalizeNonOcrable()
  void processQueue()
}
