import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Plus, Pin, Trash2, Tag, Copy } from 'lucide-react'
import type { Note } from '../types'
import Modal from '../components/shared/Modal'

export default function NotesPage(): JSX.Element {
  const { caseId } = useParams<{ caseId: string }>()
  const id = Number(caseId)
  const [notes, setNotes] = useState<Note[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing] = useState<Note | null>(null)
  const [form, setForm] = useState({ title: '', body: '', tags: '' })

  async function fetchNotes(): Promise<void> {
    const data = (await window.api.notes.list(id)) as Note[]
    setNotes(data)
  }

  useEffect(() => {
    fetchNotes()
  }, [id])

  async function handleSave(): Promise<void> {
    const tags = form.tags
      .split(/[,、]/)
      .map((t) => t.trim())
      .filter(Boolean)

    if (editing) {
      await window.api.notes.update(editing.id, {
        title: form.title,
        body: form.body,
        tags
      })
    } else {
      await window.api.notes.create({
        caseId: id,
        title: form.title,
        body: form.body,
        tags
      })
    }
    setShowCreate(false)
    setEditing(null)
    setForm({ title: '', body: '', tags: '' })
    await fetchNotes()
  }

  function openEdit(note: Note): void {
    setEditing(note)
    const tags = (() => {
      try {
        return (JSON.parse(note.tags) as string[]).join(', ')
      } catch {
        return ''
      }
    })()
    setForm({ title: note.title, body: note.body, tags })
    setShowCreate(true)
  }

  async function handleDelete(noteId: number): Promise<void> {
    if (!confirm('このメモを削除しますか?')) return
    await window.api.notes.delete(noteId)
    await fetchNotes()
  }

  async function togglePin(note: Note): Promise<void> {
    await window.api.notes.update(note.id, { is_pinned: note.is_pinned ? 0 : 1 })
    await fetchNotes()
  }

  function parseTags(tagsJson: string): string[] {
    try {
      return JSON.parse(tagsJson) as string[]
    } catch {
      return []
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900">メモ・Wiki</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            案件全体のメモはこちら · 個別文書の Wiki は各ドキュメント詳細の「Wiki」タブから編集できます
          </p>
          <p className="text-xs text-gray-400 mt-0.5">メモ {notes.length}件</p>
        </div>
        <button
          onClick={() => {
            setEditing(null)
            setForm({ title: '', body: '', tags: '' })
            setShowCreate(true)
          }}
          className="btn-primary text-xs"
        >
          <Plus size={14} />
          新規メモ
        </button>
      </div>

      {notes.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">
          <p className="mb-3">メモがありません</p>
          <button onClick={() => setShowCreate(true)} className="btn-primary text-xs">
            最初のメモを作成
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {notes.map((note) => {
            const tags = parseTags(note.tags)
            return (
              <div
                key={note.id}
                className={`card p-4 cursor-pointer hover:shadow-md transition-all ${
                  note.is_pinned ? 'border-yellow-200 bg-yellow-50' : ''
                }`}
                onClick={() => openEdit(note)}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {note.title || '（無題）'}
                  </p>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        togglePin(note)
                      }}
                      className={`p-1 rounded transition-colors ${
                        note.is_pinned ? 'text-yellow-500' : 'text-gray-300 hover:text-yellow-400'
                      }`}
                    >
                      <Pin size={13} fill={note.is_pinned ? 'currentColor' : 'none'} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        window.api.shell.copyText(note.body)
                      }}
                      className="p-1 rounded text-gray-300 hover:text-gray-500 transition-colors"
                    >
                      <Copy size={13} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(note.id)
                      }}
                      className="p-1 rounded text-gray-300 hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1.5 line-clamp-3 leading-relaxed">
                  {note.body}
                </p>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-3">
                    {tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-xs"
                      >
                        <Tag size={9} />
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                <p className="text-xs text-gray-300 mt-2">
                  {new Date(note.updated_at).toLocaleDateString('ja-JP')}
                </p>
              </div>
            )
          })}
        </div>
      )}

      <Modal
        open={showCreate}
        onClose={() => {
          setShowCreate(false)
          setEditing(null)
        }}
        title={editing ? 'メモを編集' : '新規メモ'}
        maxWidth="max-w-xl"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">タイトル</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="input"
              placeholder="メモのタイトル"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">内容</label>
            <textarea
              value={form.body}
              onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
              rows={8}
              className="input resize-none"
              placeholder="メモの内容..."
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              タグ（カンマ区切り）
            </label>
            <input
              type="text"
              value={form.tags}
              onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
              className="input"
              placeholder="例: 証拠, 証人, 重要"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => {
                setShowCreate(false)
                setEditing(null)
              }}
              className="btn-secondary"
            >
              キャンセル
            </button>
            <button onClick={handleSave} className="btn-primary">
              {editing ? '保存' : '作成'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
