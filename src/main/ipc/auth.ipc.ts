import { ipcMain } from 'electron'
import {
  canUseBiometric,
  promptBiometric,
  getAuthSettings,
  setAuthMethod,
  setPin,
  verifyPin,
  completeSetup,
  setAutoLock
} from '../auth'
import type { AuthMethod } from '../auth'

export function registerAuthIpc(): void {
  ipcMain.handle('auth:get-state', () => getAuthSettings())

  ipcMain.handle('auth:can-use-biometric', () => canUseBiometric())

  ipcMain.handle('auth:prompt-biometric', async () => promptBiometric())

  ipcMain.handle('auth:verify-pin', (_, { pin }: { pin: string }) => verifyPin(pin))

  ipcMain.handle('auth:set-pin', (_, { pin }: { pin: string }) => setPin(pin))

  ipcMain.handle('auth:set-method', (_, { method }: { method: AuthMethod }) =>
    setAuthMethod(method)
  )

  ipcMain.handle('auth:complete-setup', () => completeSetup())

  ipcMain.handle('auth:set-auto-lock', (_, { minutes }: { minutes: number }) =>
    setAutoLock(minutes)
  )
}
