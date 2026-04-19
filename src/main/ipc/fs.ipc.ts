import { ipcMain, dialog, shell, BrowserWindow } from 'electron'
import { readFileSync, existsSync } from 'fs'
import { detectMimeType } from '../services/fileService'

export function registerFsIpc(): void {
  ipcMain.handle('fs:read-file', (_, filePath: string) => {
    if (!existsSync(filePath)) throw new Error(`File not found: ${filePath}`)
    const data = readFileSync(filePath)
    const mimeType = detectMimeType(filePath)
    return { data: data.buffer, mimeType }
  })

  ipcMain.handle(
    'fs:open-dialog',
    async (
      event,
      {
        filters,
        properties
      }: { filters: Electron.FileFilter[]; properties: string[] }
    ) => {
      const win = BrowserWindow.fromWebContents(event.sender)
      const result = await dialog.showOpenDialog(win!, {
        filters: filters ?? [{ name: 'All Files', extensions: ['*'] }],
        properties: (properties as ('openFile' | 'multiSelections' | 'openDirectory')[]) ?? ['openFile', 'multiSelections']
      })
      return result.canceled ? [] : result.filePaths
    }
  )

  ipcMain.handle('fs:folder-dialog', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    const result = await dialog.showOpenDialog(win!, {
      properties: ['openDirectory']
    })
    return result.canceled ? null : result.filePaths[0]
  })

  ipcMain.handle('fs:file-exists', (_, filePath: string) => {
    return existsSync(filePath)
  })

  ipcMain.handle('fs:show-in-finder', (_, filePath: string) => {
    shell.showItemInFolder(filePath)
  })

  ipcMain.handle(
    'fs:save-file',
    async (
      _,
      { buffer, defaultName, filters }: {
        buffer: ArrayBuffer
        defaultName: string
        filters?: Electron.FileFilter[]
      }
    ) => {
      const { dialog } = require('electron')
      const { writeFileSync } = require('fs')
      const result = await dialog.showSaveDialog({
        defaultPath: defaultName,
        filters: filters ?? [{ name: 'All Files', extensions: ['*'] }]
      })
      if (result.canceled || !result.filePath) return null
      writeFileSync(result.filePath, Buffer.from(buffer))
      return result.filePath
    }
  )
}
