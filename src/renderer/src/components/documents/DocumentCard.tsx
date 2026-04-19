import { useNavigate } from 'react-router-dom'
import { Bookmark, FileText, Image, FileType, File, Eye, Lock } from 'lucide-react'
import type { Document } from '../../types'
import { DOC_CATEGORIES } from '../../types'
import { useDocumentStore } from '../../store'

interface DocumentCardProps {
  doc: Document
  caseId: number
}

const fileIcons: Record<string, JSX.Element> = {
  pdf: <FileText size={16} className="text-red-500" />,
  image: <Image size={16} className="text-green-500" />,
  docx: <FileType size={16} className="text-blue-500" />,
  text: <FileText size={16} className="text-gray-500" />,
  other: <File size={16} className="text-yellow-500" />
}

const ocrBadge: Record<string, { cls: string; label: string }> = {
  pending: { cls: 'ocr-pending', label: 'OCR未実行' },
  running: { cls: 'ocr-running', label: 'OCR処理中' },
  done: { cls: 'ocr-done', label: 'OCR完了' },
  error: { cls: 'ocr-error', label: 'OCRエラー' }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`
}

export default function DocumentCard({ doc, caseId }: DocumentCardProps): JSX.Element {
  const navigate = useNavigate()
  const setBookmark = useDocumentStore((s) => s.setBookmark)
  const ocr = ocrBadge[doc.ocr_status] ?? ocrBadge.pending
  const catDef = DOC_CATEGORIES[doc.doc_category as keyof typeof DOC_CATEGORIES] ?? DOC_CATEGORIES.reference

  function toggleBookmark(e: React.MouseEvent): void {
    e.stopPropagation()
    setBookmark(doc.id, doc.is_bookmarked === 0)
  }

  return (
    <div
      onClick={() => navigate(`/case/${caseId}/documents/${doc.id}`)}
      className={`card p-4 cursor-pointer hover:shadow-md transition-all hover:border-gray-300 group relative ${
        doc.is_locked === 1 ? 'border-red-100' : ''
      }`}
    >
      {/* ロックインジケーター */}
      {doc.is_locked === 1 && (
        <div className="absolute top-2 right-2">
          <Lock size={11} className="text-red-400" />
        </div>
      )}

      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2.5 min-w-0 flex-1">
          <div className="mt-0.5 flex-shrink-0">
            {fileIcons[doc.file_type] ?? fileIcons.other}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-gray-900 truncate pr-4" title={doc.title}>
              {doc.title}
            </p>
            <p className="text-xs text-gray-400 truncate mt-0.5" title={doc.file_name}>
              {doc.file_name}
            </p>
          </div>
        </div>
        {doc.is_locked !== 1 && (
          <button
            onClick={toggleBookmark}
            className={`flex-shrink-0 p-1 rounded transition-colors ${
              doc.is_bookmarked
                ? 'text-yellow-500'
                : 'text-gray-300 hover:text-yellow-400'
            }`}
          >
            <Bookmark size={15} fill={doc.is_bookmarked ? 'currentColor' : 'none'} />
          </button>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {/* カテゴリバッジ */}
        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${catDef.color}`}>
          {catDef.label}
        </span>
        <span className={ocr.cls}>{ocr.label}</span>
        {doc.summary_text && (
          <span className="badge bg-purple-100 text-purple-700">要約あり</span>
        )}
      </div>

      <div className="mt-2 flex items-center justify-between text-xs text-gray-400">
        <span>{formatBytes(doc.file_size)}</span>
        <span className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Eye size={12} />
          表示
        </span>
      </div>
    </div>
  )
}
