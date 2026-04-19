import { registerCasesIpc } from './cases.ipc'
import { registerDocumentsIpc } from './documents.ipc'
import { registerNotesIpc } from './notes.ipc'
import { registerSearchIpc } from './search.ipc'
import { registerSettingsIpc } from './settings.ipc'
import { registerFsIpc } from './fs.ipc'
import { registerShellIpc } from './shell.ipc'
import { registerAiIpc } from './ai.ipc'
import { registerSectionsIpc } from './sections.ipc'
import { registerAuthIpc } from './auth.ipc'
import { registerCommentsIpc } from './comments.ipc'
import { registerActivityIpc } from './activity.ipc'
import { registerOcrIpc } from './ocr.ipc'

export function registerAllIpc(): void {
  registerCasesIpc()
  registerDocumentsIpc()
  registerNotesIpc()
  registerSearchIpc()
  registerSettingsIpc()
  registerFsIpc()
  registerShellIpc()
  registerAiIpc()
  registerSectionsIpc()
  registerAuthIpc()
  registerCommentsIpc()
  registerActivityIpc()
  registerOcrIpc()
}
