import { ipcMain } from 'electron'
import { getDb } from '../db'
import { enqueueOcr, processQueue } from '../services/ocrQueue'
import { isNdlOcrAvailable } from '../services/ndlocrService'

export function registerOcrIpc(): void {
  ipcMain.handle('ocr:is-available', () => isNdlOcrAvailable())

  ipcMain.handle('ocr:enqueue', (_, { id }: { id: number }) => {
    enqueueOcr(id)
    return { ok: true }
  })

  ipcMain.handle('ocr:enqueue-many', (_, { ids }: { ids: number[] }) => {
    for (const id of ids) enqueueOcr(id)
    return { ok: true, queued: ids.length }
  })

  ipcMain.handle('ocr:process-queue', () => {
    void processQueue()
    return { ok: true }
  })

  ipcMain.handle('ocr:status', (_, { id }: { id: number }) => {
    const db = getDb()
    return db
      .prepare(
        `SELECT id, ocr_status, ocr_error, length(ocr_text) AS text_length
         FROM documents WHERE id = ?`
      )
      .get(id)
  })

  ipcMain.handle('ocr:queue-summary', (_, { caseId }: { caseId?: number } = {}) => {
    const db = getDb()
    const where = caseId ? 'WHERE case_id = ?' : ''
    const params = caseId ? [caseId] : []
    return db
      .prepare(
        `SELECT ocr_status, COUNT(*) AS count
         FROM documents ${where}
         GROUP BY ocr_status`
      )
      .all(...params)
  })
}
