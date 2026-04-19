import { spawn } from 'child_process'
import { app } from 'electron'
import { join } from 'path'
import { existsSync } from 'fs'

export interface OcrPage {
  page: number
  text: string
}

export interface OcrResult {
  text: string
  pages: OcrPage[]
  error: string | null
}

export interface OcrProgress {
  status: string
  progress: number
  message: string
}

/**
 * プラットフォーム固有のサブディレクトリ名
 * resources/ndlocr/<platformDir>/ に PyInstaller --onedir の成果物が置かれる想定
 */
function platformDir(): string {
  if (process.platform === 'darwin') return 'mac'
  if (process.platform === 'win32') return 'win'
  return 'linux'
}

function binaryName(): string {
  return process.platform === 'win32' ? 'ndlocr_runner.exe' : 'ndlocr_runner'
}

/**
 * PyInstaller でバンドルしたバイナリを優先し、存在しなければ dev 用の
 * `python3 python/ndlocr_runner.py` にフォールバックする。
 */
function resolveRunner(): { cmd: string; baseArgs: string[]; kind: 'binary' | 'python' } | null {
  const platform = platformDir()
  const name = binaryName()

  // パッケージ版: Electron Builder の extraResources で展開された場所
  const bundled = app.isPackaged
    ? join(process.resourcesPath, 'resources', 'ndlocr', platform, name)
    : join(__dirname, '..', '..', 'resources', 'ndlocr', platform, name)

  if (existsSync(bundled)) {
    return { cmd: bundled, baseArgs: [], kind: 'binary' }
  }

  // dev フォールバック: システム python で python/ndlocr_runner.py を実行
  const devScript = join(__dirname, '..', '..', 'python', 'ndlocr_runner.py')
  if (existsSync(devScript)) {
    const py = process.platform === 'win32' ? 'python' : 'python3'
    return { cmd: py, baseArgs: [devScript], kind: 'python' }
  }

  return null
}

export function isNdlOcrAvailable(): boolean {
  return resolveRunner() !== null
}

/**
 * バンドル内 Python の依存を軽く verify する (起動確認用)。
 */
export async function checkNdlOcr(): Promise<{ ok: boolean; error?: string; modelDir?: string }> {
  const runner = resolveRunner()
  if (!runner) return { ok: false, error: 'NDLOCR ランナーが見つかりません' }

  return new Promise((resolve) => {
    const child = spawn(runner.cmd, [...runner.baseArgs, '--check'], { windowsHide: true })
    let out = ''
    child.stdout.on('data', (d: Buffer) => (out += d.toString('utf8')))
    child.on('error', (e) => resolve({ ok: false, error: e.message }))
    child.on('close', () => {
      try {
        const parsed = JSON.parse(out.trim())
        resolve(parsed.ok ? { ok: true, modelDir: parsed.model_dir } : { ok: false, error: parsed.error })
      } catch (e) {
        resolve({ ok: false, error: `check 失敗: ${(e as Error).message}` })
      }
    })
  })
}

export async function runNdlOcr(
  filePath: string,
  lang = 'jpn',
  onProgress?: (p: OcrProgress) => void
): Promise<OcrResult> {
  const runner = resolveRunner()
  if (!runner) {
    throw new Error(
      'NDLOCR-Lite が見つかりません。インストーラーが正しく展開されているか、' +
        '開発時は scripts/build-ndlocr.sh を実行して resources/ndlocr/<os>/ にバイナリを配置してください。'
    )
  }

  const args = [...runner.baseArgs, filePath, '--lang', lang]
  const child = spawn(runner.cmd, args, { windowsHide: true })

  let stdout = ''
  let stderrBuffer = ''

  child.stdout.on('data', (chunk: Buffer) => {
    stdout += chunk.toString('utf8')
  })

  child.stderr.on('data', (chunk: Buffer) => {
    stderrBuffer += chunk.toString('utf8')
    let idx: number
    while ((idx = stderrBuffer.indexOf('\n')) !== -1) {
      const line = stderrBuffer.slice(0, idx).trim()
      stderrBuffer = stderrBuffer.slice(idx + 1)
      if (!line) continue
      try {
        const ev = JSON.parse(line)
        if (ev && ev.type === 'progress' && onProgress) {
          onProgress({
            status: String(ev.status ?? ''),
            progress: Number(ev.progress ?? 0),
            message: String(ev.message ?? '')
          })
        }
      } catch {
        // デバッグ用ログ (JSON 以外): 破棄
      }
    }
  })

  return new Promise<OcrResult>((resolve, reject) => {
    child.on('error', (err) => reject(err))
    child.on('close', (code) => {
      const trimmed = stdout.trim()
      if (!trimmed) {
        return reject(new Error(`NDLOCR が空の出力で終了しました (exit ${code})`))
      }
      try {
        const parsed = JSON.parse(trimmed) as OcrResult
        if (parsed.error) return reject(new Error(parsed.error))
        resolve({
          text: parsed.text ?? '',
          pages: Array.isArray(parsed.pages) ? parsed.pages : [],
          error: null
        })
      } catch (e) {
        reject(new Error(`NDLOCR の出力を解析できません: ${(e as Error).message}\n${trimmed}`))
      }
    })
  })
}
