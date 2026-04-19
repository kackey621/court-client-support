import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { LayoutGrid, List, Lock, FileEdit, Paperclip, FolderOpen } from 'lucide-react'
import { useDocumentStore } from '../store'
import DocumentCard from '../components/documents/DocumentCard'
import ImportDropzone from '../components/documents/ImportDropzone'
import type { DocumentFilter } from '../types'
import Spinner from '../components/shared/Spinner'

const CATEGORY_TABS = [
  { value: '', label: 'すべて', Icon: FolderOpen, color: 'text-gray-500' },
  { value: 'evidence', label: '証拠文書', Icon: Lock, color: 'text-red-500' },
  { value: 'working', label: '作業文書', Icon: FileEdit, color: 'text-blue-500' },
  { value: 'reference', label: '参考文書', Icon: Paperclip, color: 'text-gray-500' }
]

export default function DocumentsPage(): JSX.Element {
  const { caseId } = useParams<{ caseId: string }>()
  const [searchParams] = useSearchParams()
  const id = Number(caseId)
  const { documents, fetchDocuments, isLoading, setFilter } = useDocumentStore()
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [showImport, setShowImport] = useState(false)
  const urlCategory = searchParams.get('category') ?? ''
  const [activeCategory, setActiveCategory] = useState(urlCategory)

  useEffect(() => {
    setActiveCategory(urlCategory)
    const newFilter: DocumentFilter = urlCategory ? { docCategory: urlCategory } : {}
    setFilter(newFilter)
    fetchDocuments(id, newFilter)
  }, [id, urlCategory])

  function applyCategory(cat: string): void {
    setActiveCategory(cat)
    const newFilter: DocumentFilter = cat ? { docCategory: cat } : {}
    setFilter(newFilter)
    fetchDocuments(id, newFilter)
  }

  return (
    <div className="space-y-5">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900">ドキュメント</h1>
          <p className="text-xs text-gray-400 mt-0.5">文書管理・インポート・カテゴリ分類</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setView(view === 'grid' ? 'list' : 'grid')}
            className="btn-secondary text-xs py-1.5 px-2.5"
            title={view === 'grid' ? 'リスト表示' : 'グリッド表示'}
          >
            {view === 'grid' ? <List size={14} /> : <LayoutGrid size={14} />}
          </button>
          <button
            onClick={() => setShowImport(!showImport)}
            className="btn-primary text-xs"
          >
            + インポート
          </button>
        </div>
      </div>

      {/* インポートドロップゾーン */}
      {showImport && (
        <ImportDropzone
          caseId={id}
          onImported={() => {
            setShowImport(false)
            fetchDocuments(id, activeCategory ? { docCategory: activeCategory } : {})
          }}
        />
      )}

      {/* カテゴリタブ */}
      <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
        {CATEGORY_TABS.map(({ value, label, Icon, color }) => (
          <button
            key={value}
            onClick={() => applyCategory(value)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex-1 justify-center ${
              activeCategory === value
                ? 'bg-white shadow-sm text-gray-900'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon size={12} className={activeCategory === value ? color : 'text-gray-400'} />
            {label}
          </button>
        ))}
      </div>

      {/* カウント */}
      {!isLoading && (
        <p className="text-xs text-gray-400">
          {activeCategory
            ? `${CATEGORY_TABS.find((t) => t.value === activeCategory)?.label ?? ''} — `
            : ''}
          {documents.length}件
        </p>
      )}

      {/* コンテンツ */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-gray-400">
          <Spinner size={24} />
          <span className="ml-2 text-sm">読み込み中...</span>
        </div>
      ) : documents.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-400 text-sm mb-3">
            {activeCategory
              ? `「${CATEGORY_TABS.find((t) => t.value === activeCategory)?.label}」の文書がありません`
              : 'ドキュメントがありません'}
          </p>
          {!activeCategory && (
            <button onClick={() => setShowImport(true)} className="btn-primary text-xs">
              最初のファイルをインポート
            </button>
          )}
        </div>
      ) : (
        <div
          className={
            view === 'grid'
              ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
              : 'space-y-2'
          }
        >
          {documents.map((doc) => (
            <DocumentCard key={doc.id} doc={doc} caseId={id} />
          ))}
        </div>
      )}
    </div>
  )
}
