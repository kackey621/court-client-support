import { existsSync, statSync, readdirSync, readFileSync } from 'fs'
import { extname, basename, join } from 'path'
import AdmZip from 'adm-zip'
import { app } from 'electron'
import { mkdirSync, writeFileSync } from 'fs'

export interface ImportedFile {
  filePath: string
  fileName: string
  fileType: string
  mimeType: string
  fileSize: number
}

const MIME_MAP: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.tiff': 'image/tiff',
  '.tif': 'image/tiff',
  '.bmp': 'image/bmp',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.doc': 'application/msword',
  '.txt': 'text/plain',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.csv': 'text/csv'
}

const TYPE_MAP: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/png': 'image',
  'image/jpeg': 'image',
  'image/gif': 'image',
  'image/webp': 'image',
  'image/tiff': 'image',
  'image/bmp': 'image',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/msword': 'docx',
  'text/plain': 'text'
}

export function detectMimeType(filePath: string): string {
  const ext = extname(filePath).toLowerCase()
  return MIME_MAP[ext] || 'application/octet-stream'
}

export function detectFileType(mimeType: string): string {
  return TYPE_MAP[mimeType] || 'other'
}

export function getFileInfo(filePath: string): ImportedFile {
  const stat = statSync(filePath)
  const fileName = basename(filePath)
  const mimeType = detectMimeType(filePath)
  return {
    filePath,
    fileName,
    fileType: detectFileType(mimeType),
    mimeType,
    fileSize: stat.size
  }
}

export function readFileAsBuffer(filePath: string): Buffer {
  return readFileSync(filePath)
}

const SUPPORTED_EXTENSIONS = new Set([
  '.pdf', '.png', '.jpg', '.jpeg', '.gif', '.webp',
  '.tiff', '.tif', '.bmp', '.docx', '.doc', '.txt', '.xlsx', '.csv'
])

export function scanFolder(folderPath: string, recursive = true): ImportedFile[] {
  const results: ImportedFile[] = []

  function scan(dir: string): void {
    const entries = readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = join(dir, entry.name)
      if (entry.isDirectory() && recursive) {
        scan(fullPath)
      } else if (entry.isFile()) {
        const ext = extname(entry.name).toLowerCase()
        if (SUPPORTED_EXTENSIONS.has(ext) && existsSync(fullPath)) {
          results.push(getFileInfo(fullPath))
        }
      }
    }
  }

  scan(folderPath)
  return results
}

export function extractZip(zipPath: string): ImportedFile[] {
  const tempDir = join(app.getPath('temp'), `court-zip-${Date.now()}`)
  mkdirSync(tempDir, { recursive: true })

  const zip = new AdmZip(zipPath)
  const entries = zip.getEntries()
  const results: ImportedFile[] = []

  for (const entry of entries) {
    if (entry.isDirectory) continue
    const ext = extname(entry.entryName).toLowerCase()
    if (!SUPPORTED_EXTENSIONS.has(ext)) continue

    const destPath = join(tempDir, entry.entryName.replace(/\//g, '_'))
    const data = entry.getData()
    writeFileSync(destPath, data)

    if (existsSync(destPath)) {
      results.push(getFileInfo(destPath))
    }
  }

  return results
}
