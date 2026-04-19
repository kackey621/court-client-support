import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Upload, MessageSquare, CheckCircle, BookOpen, Tag,
  Pin, PinOff, Zap, FileText, RefreshCw, Clock, ExternalLink
} from 'lucide-react'
import type { DocumentActivity } from '../types'

const EVENT_META: Record<string, { icon: JSX.Element; color: string; bg: string; label: string }> = {
  import:          { icon: <Upload size={12} />,        color: 'text-green-600',  bg: 'bg-green-100',  label: 'インポート'    },
  wiki_edit:       { icon: <BookOpen size={12} />,      color: 'text-blue-600',   bg: 'bg-blue-100',   label: 'Wiki編集'      },
  comment_add:     { icon: <MessageSquare size={12} />, color: 'text-indigo-600', bg: 'bg-indigo-100', label: 'コメント追加'   },
  comment_resolve: { icon: <CheckCircle size={12} />,   color: 'text-green-600',  bg: 'bg-green-100',  label: '解決済み'      },
  comment_reopen:  { icon: <RefreshCw size={12} />,     color: 'text-amber-600',  bg: 'bg-amber-100',  label: '再オープン'    },
  category_change: { icon: <Tag size={12} />,           color: 'text-purple-600', bg: 'bg-purple-100', label: 'カテゴリ変更'  },
  lock:            { icon: <Tag size={12} />,           color: 'text-red-600',    bg: 'bg-red-100',    label: 'ロック'        },
  unlock:          { icon: <Tag size={12} />,           color: 'text-gray-500',   bg: 'bg-gray-100',   label: 'ロック解除'    },
  pin:             { icon: <Pin size={12} />,           color: 'text-indigo-600', bg: 'bg-indigo-100', label: 'ピン留め'      },
  unpin:           { icon: <PinOff size={12} />,        color: 'text-gray-500',   bg: 'bg-gray-100',   label: 'ピン解除'      },
  ocr_done:        { icon: <FileText size={12} />,      color: 'text-teal-600',   bg: 'bg-teal-100',   label: 'OCR完了'       },
  summary_done:    { icon: <Zap size={12} />,           color: 'text-purple-600', bg: 'bg-purple-100', label: 'AI要約完了'    },
}

function fallback(): { icon: JSX.Element; color: string; bg: string; label: string } {
  return { icon: <Clock size={12} />, color: 'text-gray-500', bg: 'bg-gray-100', label: '変更' }
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('ja-JP', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 日付ごとにグループ化
function groupByDate(activities: DocumentActivity[]): { date: string; items: DocumentActivity[] }[] {
  const map = new Map<string, DocumentActivity[]>()
  for (const a of activities) {
    const key = new Date(a.created_at).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(a)
  }
  return Array.from(map.entries()).map(([date, items]) => ({ date, items }))
}

export default function ActivityPage(): JSX.Element {
  const { caseId } = useParams<{ caseId: string }>()
  const navigate = useNavigate()
  const id = Number(caseId)

  const [activities, setActivities] = useState<DocumentActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState('')

  useEffect(() => {
    load()
  }, [caseId])

  async function load(): Promise<void> {
    setLoading(true)
    try {
      const data = (await window.api.activity.listCase(id, 200)) as DocumentActivity[]
      setActivities(data)
    } finally {
      setLoading(false)
    }
  }

  const filtered = filterType
    ? activities.filter((a) => a.event_type === filterType)
    : activities

  const grouped = groupByDate(filtered)

  const eventTypes = [...new Set(activities.map((a) => a.event_type))]

  return (
    <div className="space-y-5 max-w-2xl">
      {/* ヘッダー */}
      <div>
        <h1 className="text-lg font-bold text-gray-900">アクティビティ</h1>
        <p className="text-xs text-gray-400 mt-0.5">
          この案件内のすべての変更履歴 — {activities.length}件
        </p>
      </div>

      {/* フィルター */}
      {eventTypes.length > 1 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setFilterType('')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              filterType === ''
                ? 'bg-gray-800 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            すべて
          </button>
          {eventTypes.map((t) => {
            const meta = EVENT_META[t] ?? fallback()
            return (
              <button
                key={t}
                onClick={() => setFilterType(filterType === t ? '' : t)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  filterType === t
                    ? `${meta.bg} ${meta.color} ring-1 ring-current`
                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {meta.label}
              </button>
            )
          })}
        </div>
      )}

      {/* コンテンツ */}
      {loading ? (
        <div className="text-center py-12 text-gray-400 text-sm">読み込み中...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Clock size={36} className="mx-auto mb-3 text-gray-200" />
          <p className="text-sm">アクティビティはまだありません</p>
          <p className="text-xs text-gray-300 mt-1">
            文書のインポートやWiki編集などを行うと履歴が記録されます
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(({ date, items }) => (
            <div key={date}>
              <div className="flex items-center gap-2 mb-3">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {date}
                </div>
                <div className="flex-1 h-px bg-gray-100" />
              </div>

              <div className="space-y-1">
                {items.map((act) => {
                  const meta = EVENT_META[act.event_type] ?? fallback()
                  return (
                    <div
                      key={act.id}
                      className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 transition-colors group"
                    >
                      {/* アイコン */}
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${meta.bg} ${meta.color}`}
                      >
                        {meta.icon}
                      </div>

                      {/* コンテンツ */}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-700 truncate">
                          {act.description}
                        </p>
                        {act.doc_title && (
                          <p className="text-xs text-gray-400 truncate">{act.doc_title}</p>
                        )}
                      </div>

                      {/* 時刻 + リンク */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs text-gray-400">
                          {new Date(act.created_at).toLocaleTimeString('ja-JP', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                        <button
                          onClick={() =>
                            navigate(`/case/${caseId}/documents/${act.document_id}`)
                          }
                          className="opacity-0 group-hover:opacity-100 p-1 rounded text-gray-400 hover:text-blue-500 transition-all"
                          title="文書を開く"
                        >
                          <ExternalLink size={12} />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
