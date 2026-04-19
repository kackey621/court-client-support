import { useState, useEffect } from 'react'
import { ExternalLink, Download } from 'lucide-react'
import type { Document } from '../../types'
import Spinner from '../shared/Spinner'

interface DocumentPreviewProps {
  doc: Document
}

export default function DocumentPreview({ doc }: DocumentPreviewProps): JSX.Element {
  const [objectUrl, setObjectUrl] = useState<string | null>(null)
  const [htmlContent, setHtmlContent] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let url: string | null = null
    setLoading(true)
    setError(null)
    setObjectUrl(null)
    setHtmlContent(null)

    async function load(): Promise<void> {
      try {
        if (doc.file_type === 'pdf') {
          const { data, mimeType } = await window.api.fs.readFile(doc.file_path)
          const blob = new Blob([data], { type: mimeType })
          url = URL.createObjectURL(blob)
          setObjectUrl(url)
        } else if (doc.file_type === 'image') {
          const { data, mimeType } = await window.api.fs.readFile(doc.file_path)
          const blob = new Blob([data], { type: mimeType })
          url = URL.createObjectURL(blob)
          setObjectUrl(url)
        } else if (doc.file_type === 'docx') {
          const { data } = await window.api.fs.readFile(doc.file_path)
          const mammoth = await import('mammoth')
          const result = await mammoth.convertToHtml(
            { arrayBuffer: data },
            { includeDefaultStyleMap: true }
          )
          setHtmlContent(result.value)
        } else if (doc.file_type === 'text') {
          const { data } = await window.api.fs.readFile(doc.file_path)
          const text = new TextDecoder('utf-8').decode(data)
          setHtmlContent(`<pre class="whitespace-pre-wrap font-sans text-sm">${escapeHtml(text)}</pre>`)
        }
      } catch (e) {
        setError(`プレビューを読み込めませんでした: ${(e as Error).message}`)
      } finally {
        setLoading(false)
      }
    }

    load()
    return () => {
      if (url) URL.revokeObjectURL(url)
    }
  }, [doc.id, doc.file_path, doc.file_type])

  function openExternal(): void {
    window.api.shell.openExternal(`file://${doc.file_path}`)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        <Spinner size={24} />
        <span className="ml-2 text-sm">読み込み中...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500 gap-3">
        <p className="text-sm">{error}</p>
        <button onClick={openExternal} className="btn-secondary text-xs">
          <ExternalLink size={13} />
          外部アプリで開く
        </button>
      </div>
    )
  }

  if (doc.file_type === 'pdf' && objectUrl) {
    return (
      <iframe
        src={objectUrl}
        className="w-full h-full border-0 rounded-lg"
        title={doc.title}
      />
    )
  }

  if (doc.file_type === 'image' && objectUrl) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-100 rounded-lg overflow-auto">
        <img
          src={objectUrl}
          alt={doc.title}
          className="max-w-full max-h-full object-contain"
        />
      </div>
    )
  }

  if (htmlContent) {
    return (
      <div
        className="h-full overflow-auto p-6 bg-white rounded-lg prose prose-sm max-w-none"
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />
    )
  }

  return (
    <div className="flex flex-col items-center justify-center h-full gap-3">
      <p className="text-sm text-gray-500">このファイル形式はプレビューに対応していません</p>
      <button onClick={openExternal} className="btn-secondary text-xs">
        <ExternalLink size={13} />
        外部アプリで開く
      </button>
    </div>
  )
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}
