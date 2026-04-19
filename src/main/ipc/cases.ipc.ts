import { ipcMain } from 'electron'
import { getDb } from '../db'

export function registerCasesIpc(): void {
  ipcMain.handle('cases:list', () => {
    const db = getDb()
    return db.prepare('SELECT * FROM cases ORDER BY id ASC').all()
  })

  ipcMain.handle('cases:get', (_, id: number) => {
    const db = getDb()
    return db.prepare('SELECT * FROM cases WHERE id = ?').get(id)
  })

  ipcMain.handle('cases:update', (_, { id, data }: { id: number; data: Record<string, unknown> }) => {
    const db = getDb()
    const allowed = ['title', 'description', 'color']
    const fields = Object.keys(data).filter((k) => allowed.includes(k))
    if (fields.length === 0) return db.prepare('SELECT * FROM cases WHERE id = ?').get(id)

    const set = fields.map((f) => `${f} = ?`).join(', ')
    const values = fields.map((f) => data[f])
    db.prepare(`UPDATE cases SET ${set}, updated_at = datetime('now','localtime') WHERE id = ?`).run(
      ...values,
      id
    )
    return db.prepare('SELECT * FROM cases WHERE id = ?').get(id)
  })
}
