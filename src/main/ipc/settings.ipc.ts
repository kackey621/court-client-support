import { ipcMain } from 'electron'
import { getDb } from '../db'

export function registerSettingsIpc(): void {
  ipcMain.handle('settings:get', (_, key: string) => {
    const db = getDb()
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as
      | { value: string }
      | undefined
    if (!row) return null
    try {
      return JSON.parse(row.value)
    } catch {
      return row.value
    }
  })

  ipcMain.handle('settings:set', (_, { key, value }: { key: string; value: unknown }) => {
    const db = getDb()
    db.prepare(
      `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now','localtime'))
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
    ).run(key, JSON.stringify(value))
  })

  ipcMain.handle('settings:get-all', () => {
    const db = getDb()
    const rows = db.prepare('SELECT key, value FROM settings').all() as {
      key: string
      value: string
    }[]
    return Object.fromEntries(
      rows.map((r) => {
        try {
          return [r.key, JSON.parse(r.value)]
        } catch {
          return [r.key, r.value]
        }
      })
    )
  })
}
