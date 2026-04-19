import { ipcMain, shell, clipboard, BrowserWindow } from 'electron'

export function registerShellIpc(): void {
  ipcMain.handle('shell:copy-text', (_, text: string) => {
    clipboard.writeText(text)
  })

  ipcMain.handle('shell:open-external', (_, url: string) => {
    shell.openExternal(url)
  })

  ipcMain.handle('shell:print', async (event, { title }: { html: string; title?: string }) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) return
    win.webContents.print(
      { silent: false, printBackground: true, margins: { marginType: 'default' } },
      () => {}
    )
    void title
  })
}
