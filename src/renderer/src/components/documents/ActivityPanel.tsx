import { useState, useEffect } from 'react'
import {
  Upload, MessageSquare, CheckCircle, BookOpen, Tag,
  Pin, PinOff, Zap, FileText, RefreshCw, Clock
} from 'lucide-react'
import type { DocumentActivity } from '../../types'

interface Props {
  documentId: number
}

const EVENT_META: Record<
  string,
  { icon: JSX.Element; color: string; bg: string }
> = {
  import:           { icon: <Upload size={11} />,       color: 'text-green-600',  bg: 'bg-green-50'  },
  wiki_edit:        { icon: <BookOpen size={11} />,     color: 'text-blue-600',   bg: 'bg-blue-50'   },
  comment_add:      { icon: <MessageSquare size={11} />,color: 'text-indigo-600', bg: 'bg-indigo-50' },
  comment_resolve:  { icon: <CheckCircle size={11} />,  color: 'text-green-600',  bg: 'bg-green-50'  },
  comment_reopen:   { icon: <RefreshCw size={11} />,    color: 'text-amber-600',  bg: 'bg-amber-50'  },
  category_change:  { icon: <Tag size={11} />,          color: 'text-purple-600', bg: 'bg-purple-50' },
  lock:             { icon: <Tag size={11} />,          color: 'text-red-600',    bg: 'bg-red-50'    },
  unlock:           { icon: <Tag size={11} />,          color: 'text-gray-600',   bg: 'bg-gray-50'   },
  pin:              { icon: <Pin size={11} />,           color: 'text-indigo-600', bg: 'bg-indigo-50' },
  unpin:            { icon: <PinOff size={11} />,        color: 'text-gray-500',   bg: 'bg-gray-50'   },
  ocr_done:         { icon: <FileText size={11} />,     color: 'text-teal-600',   bg: 'bg-teal-50'   },
  summary_done:     { icon: <Zap size={11} />,          color: 'text-purple-600', bg: 'bg-purple-50' },
}

function fallbackMeta(eventType: string): { icon: JSX.Element; color: string; bg: string } {
  return { icon: <Clock size={11} />, color: 'text-gray-500', bg: 'bg-gray-50' }
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'たった今'
  if (mins < 60) return `${mins}分前`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}時間前`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}日前`
  return new Date(iso).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })
}

export default function ActivityPanel({ documentId }: Props): JSX.Element {
  const [activities, setActivities] = useState<DocumentActivity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    load()
  }, [documentId])

  async function load(): Promise<void> {
    setLoading(true)
    try {
      const data = (await window.api.activity.listDocument(documentId, 50)) as DocumentActivity[]
      setActivities(data)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-gray-400 text-xs">
        読み込み中...
      </div>
    )
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        <Clock size={28} className="mx-auto mb-2 text-gray-200" />
        <p className="text-xs">アクティビティはまだありません</p>
      </div>
    )
  }

  return (
    <div className="space-y-0.5">
      {activities.map((act, idx) => {
        const meta = EVENT_META[act.event_type] ?? fallbackMeta(act.event_type)
        return (
          <div key={act.id} className="flex items-start gap-2.5 py-2 group">
            {/* タイムライン線 */}
            <div className="flex flex-col items-center flex-shrink-0 mt-0.5">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center ${meta.bg} ${meta.color} flex-shrink-0`}>
                {meta.icon}
              </div>
              {idx < activities.length - 1 && (
                <div className="w-px h-3 bg-gray-100 mt-0.5" />
              )}
            </div>

            {/* コンテンツ */}
            <div className="flex-1 min-w-0 pt-0.5">
              <p className="text-xs text-gray-700 leading-tight">{act.description}</p>
              <p className="text-xs text-gray-400 mt-0.5">{formatRelative(act.created_at)}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
