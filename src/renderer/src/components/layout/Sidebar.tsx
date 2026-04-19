import { NavLink, useNavigate } from 'react-router-dom'
import {
  Search, BookOpen, Bookmark, Scale, Settings,
  ChevronDown, FileText, Image, File, Pin, FolderOpen,
  Lock, FileEdit, Paperclip, LogOut, Activity
} from 'lucide-react'
import { useCaseStore, useAuthStore } from '../../store'
import { useState, useEffect } from 'react'
import type { PinnedNavItem } from '../../types'

interface SidebarProps {
  caseId: number
}

const fileIcon = (type: string): JSX.Element => {
  if (type === 'pdf') return <FileText size={13} className="text-red-400 flex-shrink-0" />
  if (type === 'image') return <Image size={13} className="text-green-400 flex-shrink-0" />
  return <File size={13} className="text-gray-400 flex-shrink-0" />
}

const categoryIcon = (cat: string): JSX.Element => {
  if (cat === 'evidence') return <Lock size={10} className="text-red-400" />
  if (cat === 'working') return <FileEdit size={10} className="text-blue-400" />
  return <Paperclip size={10} className="text-gray-400" />
}

export default function Sidebar({ caseId }: SidebarProps): JSX.Element {
  const { cases, activeCase, setActiveCase } = useCaseStore()
  const { method: authMethod, lock } = useAuthStore()
  const navigate = useNavigate()
  const [caseSwitchOpen, setCaseSwitchOpen] = useState(false)
  const [pinnedItems, setPinnedItems] = useState<PinnedNavItem[]>([])

  useEffect(() => {
    loadPinned()
  }, [caseId])

  async function loadPinned(): Promise<void> {
    try {
      const items = (await window.api.pinned.list(caseId)) as PinnedNavItem[]
      setPinnedItems(items)
    } catch {
      setPinnedItems([])
    }
  }

  function switchCase(id: number): void {
    setActiveCase(id)
    navigate(`/case/${id}/search`)
    setCaseSwitchOpen(false)
  }

  const mainLinks = [
    {
      to: 'search',
      icon: Search,
      label: '検索',
      desc: 'ドキュメント・法令・判例を横断'
    },
    {
      to: 'law',
      icon: Scale,
      label: '法令検索',
      desc: 'e-gov 法令API・判例リンク'
    },
    {
      to: 'documents',
      icon: FolderOpen,
      label: 'ドキュメント',
      desc: '文書管理・インポート'
    },
    {
      to: 'notes',
      icon: BookOpen,
      label: 'メモ・Wiki',
      desc: '論点整理メモ・文書Wiki'
    },
    {
      to: 'bookmarks',
      icon: Bookmark,
      label: 'ブックマーク',
      desc: '重要文書をマーク'
    },
    {
      to: 'activity',
      icon: Activity,
      label: 'アクティビティ',
      desc: '変更履歴・編集ログ'
    }
  ]

  return (
    <aside className="w-60 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col select-none">
      {/* macOS traffic lights 余白 */}
      <div className="h-10 flex-shrink-0 bg-gray-50 border-b border-gray-100" />

      {/* 案件切替 */}
      <div className="p-3 border-b border-gray-100">
        <div className="relative">
          <button
            onClick={() => setCaseSwitchOpen(!caseSwitchOpen)}
            className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 transition-colors text-left"
          >
            <span
              className="w-2.5 h-2.5 rounded-full flex-shrink-0 ring-2 ring-white ring-offset-1"
              style={{ backgroundColor: activeCase?.color ?? '#6366f1' }}
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-gray-800 truncate">
                {activeCase?.title ?? '案件を選択'}
              </p>
            </div>
            <ChevronDown
              size={13}
              className={`text-gray-400 flex-shrink-0 transition-transform ${caseSwitchOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {caseSwitchOpen && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden">
              {cases.map((c) => (
                <button
                  key={c.id}
                  onClick={() => switchCase(c.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-xs hover:bg-gray-50 transition-colors ${
                    c.id === caseId ? 'bg-blue-50' : ''
                  }`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: c.color }}
                  />
                  <div className="min-w-0">
                    <p className={`font-medium truncate ${c.id === caseId ? 'text-blue-700' : 'text-gray-700'}`}>
                      {c.title}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* メインナビ */}
      <nav className="flex-1 overflow-y-auto p-2 space-y-0.5 pb-4">
        {mainLinks.map(({ to, icon: Icon, label, desc }) => (
          <NavLink
            key={to}
            to={`/case/${caseId}/${to}`}
            className={({ isActive }) =>
              `group flex items-start gap-2.5 px-2.5 py-2 rounded-lg transition-colors cursor-pointer ${
                isActive
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={15} className={`mt-0.5 flex-shrink-0 ${isActive ? 'text-blue-600' : ''}`} />
                <div className="min-w-0">
                  <p className="text-xs font-semibold leading-tight">{label}</p>
                  <p className={`text-xs leading-tight mt-0.5 ${isActive ? 'text-blue-500' : 'text-gray-400'}`}>
                    {desc}
                  </p>
                </div>
              </>
            )}
          </NavLink>
        ))}

        {/* ピン留め */}
        {pinnedItems.length > 0 && (
          <div className="pt-3">
            <div className="flex items-center gap-1.5 px-2.5 mb-1">
              <Pin size={11} className="text-gray-400" />
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                ピン留め
              </span>
            </div>
            {pinnedItems.map((item) => (
              <NavLink
                key={item.id}
                to={`/case/${caseId}/documents/${item.document_id}`}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`
                }
              >
                {fileIcon(item.file_type)}
                <span className="flex-1 truncate">{item.title}</span>
                {categoryIcon(item.doc_category)}
                {item.is_locked === 1 && (
                  <Lock size={10} className="text-red-400 flex-shrink-0" />
                )}
              </NavLink>
            ))}
          </div>
        )}

        {/* ドキュメントカテゴリクイックリンク */}
        <div className="pt-3">
          <div className="px-2.5 mb-1">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
              カテゴリ
            </span>
          </div>
          {[
            { cat: 'evidence', label: '証拠文書', color: 'text-red-500', Icon: Lock },
            { cat: 'working', label: '作業文書', color: 'text-blue-500', Icon: FileEdit },
            { cat: 'reference', label: '参考文書', color: 'text-gray-500', Icon: Paperclip }
          ].map(({ cat, label, color, Icon }) => (
            <NavLink
              key={cat}
              to={`/case/${caseId}/documents?category=${cat}`}
              className={({ isActive }) =>
                `flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                  isActive ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:bg-gray-50'
                }`
              }
            >
              <Icon size={13} className={`${color} flex-shrink-0`} />
              <span>{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>

      {/* フッター */}
      <div className="p-2 border-t border-gray-100 space-y-0.5">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs text-gray-500 hover:bg-gray-50 transition-colors ${
              isActive ? 'bg-gray-100 text-gray-900' : ''
            }`
          }
        >
          <Settings size={14} />
          <span>設定</span>
        </NavLink>
        {authMethod !== 'none' && (
          <button
            onClick={lock}
            className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
          >
            <LogOut size={14} />
            <span>ロック</span>
          </button>
        )}
      </div>
    </aside>
  )
}
