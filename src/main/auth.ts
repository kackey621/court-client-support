import { systemPreferences } from 'electron'
import { createHash, randomBytes } from 'crypto'
import { getDb } from './db'

export type AuthMethod = 'biometric' | 'pin' | 'none'

function hashPin(pin: string, salt: string): string {
  return createHash('sha256').update(salt + pin).digest('hex')
}

export function canUseBiometric(): boolean {
  if (process.platform === 'darwin') {
    return systemPreferences.canPromptTouchID()
  }
  if (process.platform === 'win32') return true
  return false
}

export async function promptBiometric(): Promise<boolean> {
  if (process.platform === 'darwin') {
    try {
      await systemPreferences.promptTouchID('CourtStrategiesへのアクセス認証')
      return true
    } catch {
      return false
    }
  }
  if (process.platform === 'win32') {
    return promptWindowsHello()
  }
  return false
}

async function promptWindowsHello(): Promise<boolean> {
  const { execFile } = await import('child_process')
  return new Promise((resolve) => {
    // Windows.Security.Credentials.UI.UserConsentVerifier via PowerShell
    const script = [
      'Add-Type -AssemblyName System.Runtime.WindowsRuntime',
      '$m = [System.WindowsRuntimeSystemExtensions].GetMethod("AsTask", [System.Type[]]@([System.Runtime.InteropServices.WindowsRuntime.IAsyncOperation[bool]]))',
      '$g = $m.MakeGenericMethod([bool])',
      '$op = [Windows.Security.Credentials.UI.UserConsentVerifier]::RequestVerificationAsync("CourtStrategiesへのアクセス認証")',
      '$task = $g.Invoke($null, @($op))',
      '$task.Wait()',
      'if ($task.Result -eq "Verified") { exit 0 } else { exit 1 }'
    ].join('; ')

    execFile('powershell', ['-NoProfile', '-Command', script], { timeout: 30000 }, (err) => {
      resolve(!err)
    })
  })
}

export function getAuthSettings(): {
  method: AuthMethod
  isFirstRun: boolean
  autoLockMinutes: number
} {
  const db = getDb()
  const get = (key: string): string | undefined =>
    (db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined)
      ?.value

  const method = get('auth_method')
  const isFirstRunVal = get('is_first_run')
  const autoLock = get('auto_lock_minutes')

  return {
    method: method ? (JSON.parse(method) as AuthMethod) : 'none',
    isFirstRun: isFirstRunVal ? JSON.parse(isFirstRunVal) === true : true,
    autoLockMinutes: autoLock ? (JSON.parse(autoLock) as number) : 5
  }
}

export function setAuthMethod(method: AuthMethod): void {
  const db = getDb()
  db.prepare("INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now','localtime'))").run(
    'auth_method',
    JSON.stringify(method)
  )
}

export function setPin(pin: string): void {
  const db = getDb()
  const salt = randomBytes(16).toString('hex')
  const hash = hashPin(pin, salt)
  const upsert = db.prepare(
    "INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now','localtime'))"
  )
  db.transaction(() => {
    upsert.run('auth_pin_hash', JSON.stringify(hash))
    upsert.run('auth_pin_salt', JSON.stringify(salt))
  })()
}

export function verifyPin(pin: string): boolean {
  const db = getDb()
  const get = (key: string): string | undefined =>
    (db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined)
      ?.value

  const hashVal = get('auth_pin_hash')
  const saltVal = get('auth_pin_salt')
  if (!hashVal || !saltVal) return false

  const stored = JSON.parse(hashVal) as string
  const salt = JSON.parse(saltVal) as string
  return hashPin(pin, salt) === stored
}

export function completeSetup(): void {
  const db = getDb()
  db.prepare(
    "INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('is_first_run', 'false', datetime('now','localtime'))"
  ).run()
}

export function setAutoLock(minutes: number): void {
  const db = getDb()
  db.prepare(
    "INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('auto_lock_minutes', ?, datetime('now','localtime'))"
  ).run(JSON.stringify(minutes))
}
