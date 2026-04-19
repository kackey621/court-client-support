import { useState, useCallback } from 'react'
import { Upload, FolderOpen, Archive } from 'lucide-react'
import { useDocumentStore } from '../../store'

interface ImportDropzoneProps {
  caseId: number
  onImported?: () => void
}

export default function ImportDropzone({ caseId, onImported }: ImportDropzoneProps): JSX.Element {
  const [isDragOver, setIsDragOver] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const { importFiles, importZip, importFolder } = useDocumentStore()

  const handleFiles = useCallback(
    async (filePaths: string[]) => {
      setIsImporting(true)
      try {
        const zips = filePaths.filter((f) => f.toLowerCase().endsWith('.zip'))
        const others = filePaths.filter((f) => !f.toLowerCase().endsWith('.zip'))

        for (const zip of zips) {
          await importZip(caseId, zip)
        }
        if (others.length > 0) {
          await importFiles(caseId, others)
        }
        onImported?.()
      } finally {
        setIsImporting(false)
      }
    },
    [caseId, importFiles, importZip, onImported]
  )

  async function openFileDialog(): Promise<void> {
    const paths = await window.api.fs.openDialog(
      [
        {
          name: '対応ファイル',
          extensions: ['pdf', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'tiff', 'bmp', 'docx', 'doc', 'txt', 'zip']
        }
      ],
      ['openFile', 'multiSelections']
    )
    if (paths.length > 0) await handleFiles(paths)
  }

  async function openFolderDialog(): Promise<void> {
    const folder = await window.api.fs.folderDialog()
    if (folder) {
      setIsImporting(true)
      try {
        await importFolder(caseId, folder)
        onImported?.()
      } finally {
        setIsImporting(false)
      }
    }
  }

  function onDragOver(e: React.DragEvent): void {
    e.preventDefault()
    setIsDragOver(true)
  }

  function onDragLeave(): void {
    setIsDragOver(false)
  }

  function onDrop(e: React.DragEvent): void {
    e.preventDefault()
    setIsDragOver(false)
    const paths = Array.from(e.dataTransfer.files).map((f) => f.path)
    if (paths.length > 0) handleFiles(paths)
  }

  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
        isDragOver
          ? 'border-blue-400 bg-blue-50'
          : 'border-gray-200 hover:border-gray-300 bg-white'
      }`}
    >
      <Upload
        size={32}
        className={`mx-auto mb-3 ${isDragOver ? 'text-blue-500' : 'text-gray-300'}`}
      />
      <p className="text-sm font-medium text-gray-700 mb-1">
        ファイルをここにドロップ
      </p>
      <p className="text-xs text-gray-400 mb-4">
        PDF・画像・Word・ZIP・フォルダに対応
      </p>
      <div className="flex items-center justify-center gap-2">
        <button
          onClick={openFileDialog}
          disabled={isImporting}
          className="btn-primary text-xs"
        >
          <Upload size={13} />
          ファイルを選択
        </button>
        <button
          onClick={openFolderDialog}
          disabled={isImporting}
          className="btn-secondary text-xs"
        >
          <FolderOpen size={13} />
          フォルダを選択
        </button>
      </div>
      {isImporting && (
        <p className="mt-3 text-xs text-blue-600 animate-pulse">インポート中...</p>
      )}
    </div>
  )
}
