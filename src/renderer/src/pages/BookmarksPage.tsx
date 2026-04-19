import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Bookmark, FileText, Image, File, ExternalLink } from 'lucide-react'
import type { Bookmark as BookmarkType } from '../types'

export default function BookmarksPage(): JSX.Element {
  const { caseId } = useParams<{ caseId: string }>()
  const navigate = useNavigate()
  const id = Number(caseId)
  const [bookmarks, setBookmarks] = useState<BookmarkType[]>([])

  async function fetchBookmarks(): Promise<void> {
    const data = (await window.api.bookmarks.list(id)) as BookmarkType[]
    setBookmarks(data)
  }

  useEffect(() => {
    fetchBookmarks()
  }, [id])

  const fileIcons: Record<string, JSX.Element> = {
    pdf: <FileText size={16} className="text-red-500" />,
    image: <Image size={16} className="text-green-500" />,
    docx: <File size={16} className="text-blue-500" />,
    other: <File size={16} className="text-gray-400" />
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-bold text-gray-900">ブックマーク</h1>
        <p className="text-xs text-gray-400 mt-0.5">重要文書をマーク — {bookmarks.length}件</p>
      </div>

      {bookmarks.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">
          <Bookmark size={32} className="mx-auto mb-3 text-gray-200" />
          <p>ブックマークがありません</p>
          <p className="text-xs mt-1">文書詳細画面からブックマークに追加できます</p>
        </div>
      ) : (
        <div className="space-y-2">
          {bookmarks.map((bm) => (
            <div
              key={bm.id}
              className="card p-4 flex items-center gap-3 cursor-pointer hover:shadow-md hover:border-gray-300 transition-all"
              onClick={() => navigate(`/case/${caseId}/documents/${bm.document_id}`)}
            >
              <div className="flex-shrink-0">
                {fileIcons[bm.file_type] ?? fileIcons.other}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{bm.doc_title}</p>
                {bm.comment && (
                  <p className="text-xs text-gray-500 truncate mt-0.5">{bm.comment}</p>
                )}
                <p className="text-xs text-gray-300 mt-0.5">
                  {new Date(bm.created_at).toLocaleDateString('ja-JP')}
                </p>
              </div>
              <ExternalLink size={14} className="text-gray-300 flex-shrink-0" />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
