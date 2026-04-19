import { useState, useEffect } from 'react'
import { MessageSquare, Plus, Check, RotateCcw, Trash2, Edit3 } from 'lucide-react'
import type { DocumentComment } from '../../types'

interface Props {
  documentId: number
  caseId: number
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('ja-JP', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export default function CommentsPanel({ documentId, caseId }: Props): JSX.Element {
  const [comments, setComments] = useState<DocumentComment[]>([])
  const [newContent, setNewContent] = useState('')
  const [newPageRef, setNewPageRef] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editContent, setEditContent] = useState('')
  const [showAdd, setShowAdd] = useState(false)

  useEffect(() => {
    loadComments()
  }, [documentId])

  async function loadComments(): Promise<void> {
    const data = (await window.api.comments.list(documentId)) as DocumentComment[]
    setComments(data)
  }

  async function handleAdd(): Promise<void> {
    if (!newContent.trim()) return
    await window.api.comments.create(
      documentId,
      caseId,
      newContent.trim(),
      newPageRef.trim() || undefined
    )
    setNewContent('')
    setNewPageRef('')
    setShowAdd(false)
    await loadComments()
  }

  async function handleResolve(id: number, resolved: boolean): Promise<void> {
    await window.api.comments.resolve(id, resolved)
    await loadComments()
  }

  async function handleDelete(id: number): Promise<void> {
    if (!confirm('このコメントを削除しますか?')) return
    await window.api.comments.delete(id)
    await loadComments()
  }

  async function handleEdit(id: number): Promise<void> {
    if (!editContent.trim()) return
    await window.api.comments.update(id, editContent.trim())
    setEditingId(null)
    await loadComments()
  }

  const unresolved = comments.filter((c) => c.is_resolved === 0)
  const resolved = comments.filter((c) => c.is_resolved === 1)

  return (
    <div className="space-y-3">
      {/* 追加ボタン */}
      <button
        onClick={() => setShowAdd(!showAdd)}
        className="w-full flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-600 hover:bg-blue-100 transition-colors"
      >
        <Plus size={13} />
        コメントを追加
      </button>

      {/* 追加フォーム */}
      {showAdd && (
        <div className="border border-blue-200 rounded-xl p-3 space-y-2 bg-blue-50">
          <textarea
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder="コメントを入力..."
            rows={3}
            className="input text-xs resize-none"
            autoFocus
          />
          <input
            type="text"
            value={newPageRef}
            onChange={(e) => setNewPageRef(e.target.value)}
            placeholder="ページ参照（例: p.3、第2項）"
            className="input text-xs"
          />
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              disabled={!newContent.trim()}
              className="btn-primary text-xs flex-1"
            >
              追加
            </button>
            <button onClick={() => setShowAdd(false)} className="btn-secondary text-xs">
              キャンセル
            </button>
          </div>
        </div>
      )}

      {/* 未解決コメントなし */}
      {unresolved.length === 0 && resolved.length === 0 && (
        <div className="text-center py-8 text-gray-400">
          <MessageSquare size={28} className="mx-auto mb-2 text-gray-200" />
          <p className="text-xs">コメントはまだありません</p>
          <p className="text-xs text-gray-300 mt-1">
            文書に関するメモや疑問点を追加できます
          </p>
        </div>
      )}

      {/* 未解決コメント */}
      {unresolved.map((c) => (
        <div
          key={c.id}
          className="border border-gray-200 rounded-xl p-3 bg-white space-y-2 group"
        >
          {editingId === c.id ? (
            <div className="space-y-2">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={3}
                className="input text-xs resize-none"
                autoFocus
              />
              <div className="flex gap-1.5">
                <button onClick={() => handleEdit(c.id)} className="btn-primary text-xs">
                  保存
                </button>
                <button onClick={() => setEditingId(null)} className="btn-secondary text-xs">
                  キャンセル
                </button>
              </div>
            </div>
          ) : (
            <>
              {c.page_ref && (
                <span className="inline-block bg-indigo-50 text-indigo-600 text-xs px-2 py-0.5 rounded-full font-medium">
                  {c.page_ref}
                </span>
              )}
              <p className="text-xs text-gray-800 whitespace-pre-wrap leading-relaxed">
                {c.content}
              </p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">{formatDate(c.created_at)}</span>
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => {
                      setEditingId(c.id)
                      setEditContent(c.content)
                    }}
                    className="p-1.5 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                    title="編集"
                  >
                    <Edit3 size={11} />
                  </button>
                  <button
                    onClick={() => handleResolve(c.id, true)}
                    className="p-1.5 rounded text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors"
                    title="解決済みにする"
                  >
                    <Check size={11} />
                  </button>
                  <button
                    onClick={() => handleDelete(c.id)}
                    className="p-1.5 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    title="削除"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      ))}

      {/* 解決済みコメント */}
      {resolved.length > 0 && (
        <details>
          <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600 select-none py-1">
            解決済み {resolved.length}件
          </summary>
          <div className="mt-2 space-y-2">
            {resolved.map((c) => (
              <div
                key={c.id}
                className="border border-gray-100 rounded-xl p-3 bg-gray-50 group"
              >
                <p className="text-xs text-gray-400 line-through leading-relaxed">{c.content}</p>
                <div className="flex items-center justify-between mt-1.5">
                  <span className="text-xs text-gray-300">{formatDate(c.created_at)}</span>
                  <button
                    onClick={() => handleResolve(c.id, false)}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded text-gray-300 hover:text-blue-500 transition-all"
                    title="未解決に戻す"
                  >
                    <RotateCcw size={11} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  )
}
