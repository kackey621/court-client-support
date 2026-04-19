import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Printer, Bookmark, FolderOpen, Trash2,
  Pin, PinOff, Lock, Unlock, ChevronDown, FileDown
} from 'lucide-react'
import type { Document, DocumentComment } from '../types'
import { DOC_CATEGORIES } from '../types'
import { useCaseStore, useDocumentStore } from '../store'
import DocumentPreview from '../components/documents/DocumentPreview'
import OCRPanel from '../components/documents/OCRPanel'
import SummaryPanel from '../components/ai/SummaryPanel'
import AIFlashPanel from '../components/ai/AIFlashPanel'
import CommentsPanel from '../components/documents/CommentsPanel'
import WikiEditor from '../components/documents/WikiEditor'
import ExportPanel from '../components/documents/ExportPanel'
import ActivityPanel from '../components/documents/ActivityPanel'
import Spinner from '../components/shared/Spinner'

type TabId = 'info' | 'comments' | 'wiki' | 'ocr' | 'summary' | 'ai' | 'export' | 'activity'

export default function DocumentDetailPage(): JSX.Element {
  const { caseId, docId } = useParams<{ caseId: string; docId: string }>()
  const navigate = useNavigate()
  const [doc, setDoc] = useState<Document | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabId>('info')
  const [isPinned, setIsPinned] = useState(false)
  const [showCategoryMenu, setShowCategoryMenu] = useState(false)
  const [comments, setComments] = useState<DocumentComment[]>([])
  const activeCase = useCaseStore((s) => s.activeCase)
  const { setBookmark, deleteDocument } = useDocumentStore()
  const numCaseId = Number(caseId)
  const numDocId = Number(docId)

  useEffect(() => {
    load()
  }, [docId, caseId])

  async function load(): Promise<void> {
    setLoading(true)
    const [d, pinned, cmts] = await Promise.all([
      window.api.documents.get(numDocId) as Promise<Document>,
      window.api.pinned.list(numCaseId) as Promise<{ document_id: number }[]>,
      window.api.comments.list(numDocId) as Promise<DocumentComment[]>
    ])
    setDoc(d)
    setIsPinned(pinned.some((p) => p.document_id === numDocId))
    setComments(cmts)
    setLoading(false)
  }

  async function refreshComments(): Promise<void> {
    const cmts = (await window.api.comments.list(numDocId)) as DocumentComment[]
    setComments(cmts)
  }

  async function handleBookmark(): Promise<void> {
    if (!doc) return
    await setBookmark(doc.id, doc.is_bookmarked === 0)
    const updated = (await window.api.documents.get(doc.id)) as Document
    setDoc(updated)
  }

  async function handleDelete(): Promise<void> {
    if (!doc || !confirm(`「${doc.title}」を削除しますか?`)) return
    await deleteDocument(doc.id)
    navigate(`/case/${caseId}/documents`)
  }

  async function togglePin(): Promise<void> {
    if (!doc) return
    if (isPinned) {
      await window.api.pinned.remove(numCaseId, doc.id)
      setIsPinned(false)
    } else {
      await window.api.pinned.add(numCaseId, doc.id)
      setIsPinned(true)
    }
  }

  async function setCategory(cat: string): Promise<void> {
    if (!doc) return
    const updated = (await window.api.documents.setCategory(doc.id, cat)) as Document
    setDoc(updated)
    setShowCategoryMenu(false)
  }

  async function toggleLock(): Promise<void> {
    if (!doc) return
    const newLocked = doc.is_locked !== 1
    if (newLocked && !confirm('この文書をロックすると変更・削除ができなくなります。続けますか?')) return
    const updated = (await window.api.documents.setCategory(doc.id, doc.doc_category, newLocked)) as Document
    setDoc(updated)
  }

  const tabs: { id: TabId; label: string; badge?: number }[] = [
    { id: 'info',     label: '情報' },
    { id: 'comments', label: 'コメント', badge: comments.filter((c) => c.is_resolved === 0).length || undefined },
    { id: 'wiki',     label: 'Wiki' },
    { id: 'ocr',      label: 'OCR' },
    { id: 'summary',  label: 'AI要約' },
    { id: 'ai',       label: 'AI' },
    { id: 'export',   label: '出力' },
    { id: 'activity', label: '履歴' },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <Spinner size={24} />
      </div>
    )
  }

  if (!doc) {
    return <div className="text-center py-16 text-gray-400 text-sm">文書が見つかりません</div>
  }

  const catDef = DOC_CATEGORIES[doc.doc_category as keyof typeof DOC_CATEGORIES] ?? DOC_CATEGORIES.reference

  return (
    <div className="flex flex-col h-full -m-6">
      {/* トップバー */}
      <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => navigate(`/case/${caseId}/documents`)}
            className="text-gray-400 hover:text-gray-600 flex-shrink-0"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-semibold text-gray-900 truncate">{doc.title}</h1>
              {doc.is_locked === 1 && <Lock size={12} className="text-red-400 flex-shrink-0" />}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-xs text-gray-400 truncate">{doc.file_name}</p>
              <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${catDef.color}`}>
                {catDef.label}
              </span>
              {doc.wiki_content && (
                <span className="text-xs px-1.5 py-0.5 rounded font-medium bg-blue-50 text-blue-600">
                  Wiki
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={togglePin}
            className={`btn-secondary text-xs py-1 ${isPinned ? 'text-indigo-500 bg-indigo-50' : ''}`}
            title={isPinned ? 'ピンを外す' : 'サイドバーにピン留め'}
          >
            {isPinned ? <PinOff size={13} /> : <Pin size={13} />}
          </button>
          <button
            onClick={() => { setActiveTab('export') }}
            className="btn-secondary text-xs py-1"
            title="出力"
          >
            <FileDown size={13} />
          </button>
          <button onClick={() => window.api.shell.print('', doc.title)} className="btn-secondary text-xs py-1" title="印刷">
            <Printer size={13} />
          </button>
          <button onClick={() => window.api.fs.showInFinder(doc.file_path)} className="btn-secondary text-xs py-1" title="Finderで表示">
            <FolderOpen size={13} />
          </button>
          {doc.is_locked !== 1 && (
            <>
              <button
                onClick={handleBookmark}
                className={`btn-secondary text-xs py-1 ${doc.is_bookmarked ? 'text-yellow-500' : ''}`}
                title="ブックマーク"
              >
                <Bookmark size={13} fill={doc.is_bookmarked ? 'currentColor' : 'none'} />
              </button>
              <button onClick={handleDelete} className="btn-secondary text-xs py-1 text-red-500 hover:bg-red-50" title="削除">
                <Trash2 size={13} />
              </button>
            </>
          )}
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* プレビューエリア */}
        <div className="flex-1 overflow-hidden bg-gray-100 p-4">
          <DocumentPreview doc={doc} />
        </div>

        {/* 右パネル */}
        <div className="w-80 flex-shrink-0 bg-white border-l border-gray-200 flex flex-col overflow-hidden">
          {/* タブバー（スクロール対応） */}
          <div className="flex border-b border-gray-100 flex-shrink-0 overflow-x-auto scrollbar-none">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex-shrink-0 px-2.5 py-2.5 text-xs font-medium transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
                {tab.badge != null && tab.badge > 0 && (
                  <span className="ml-1 bg-blue-100 text-blue-600 text-xs rounded-full px-1 min-w-[16px] inline-flex items-center justify-center">
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* タブコンテンツ */}
          <div className="flex-1 overflow-auto p-3">
            {/* 情報タブ */}
            {activeTab === 'info' && (
              <div className="space-y-4">
                <div className="text-xs space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-gray-500">ファイル名</span>
                    <span className="font-medium text-gray-700 truncate max-w-[60%]" title={doc.file_name}>{doc.file_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">種別</span>
                    <span className="font-medium text-gray-700">{doc.file_type.toUpperCase()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">サイズ</span>
                    <span className="font-medium text-gray-700">{(doc.file_size / 1024).toFixed(0)}KB</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">インポート</span>
                    <span className="font-medium text-gray-700">{new Date(doc.imported_at).toLocaleDateString('ja-JP')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">更新</span>
                    <span className="font-medium text-gray-700">{new Date(doc.updated_at).toLocaleDateString('ja-JP')}</span>
                  </div>
                </div>

                {/* カテゴリ変更 */}
                <div className="border-t border-gray-100 pt-3 space-y-2">
                  <p className="text-xs font-medium text-gray-600">分類</p>
                  <div className="relative">
                    <button
                      onClick={() => !doc.is_locked && setShowCategoryMenu(!showCategoryMenu)}
                      disabled={doc.is_locked === 1}
                      className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg border text-xs transition-colors ${
                        doc.is_locked === 1
                          ? 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed'
                          : 'bg-white border-gray-200 hover:border-gray-300 cursor-pointer'
                      }`}
                    >
                      <span className={`px-1.5 py-0.5 rounded font-medium ${catDef.color}`}>{catDef.label}</span>
                      {doc.is_locked !== 1 && <ChevronDown size={12} className="text-gray-400" />}
                    </button>
                    {showCategoryMenu && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-10 overflow-hidden">
                        {Object.entries(DOC_CATEGORIES).map(([key, def]) => (
                          <button
                            key={key}
                            onClick={() => setCategory(key)}
                            className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-50 transition-colors flex items-center gap-2 ${doc.doc_category === key ? 'bg-blue-50' : ''}`}
                          >
                            <span className={`px-1.5 py-0.5 rounded font-medium ${def.color}`}>{def.label}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={toggleLock}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg border text-xs transition-colors ${
                      doc.is_locked === 1
                        ? 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100'
                        : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    {doc.is_locked === 1 ? (
                      <><Lock size={12} /><span className="flex-1 text-left">ロック中（変更不可）</span><Unlock size={12} className="text-gray-400" /></>
                    ) : (
                      <><Unlock size={12} /><span className="flex-1 text-left">ロックして証拠保全</span><Lock size={12} className="text-gray-400" /></>
                    )}
                  </button>
                </div>

                {/* ピン留め */}
                <div className="border-t border-gray-100 pt-3">
                  <button
                    onClick={togglePin}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg border text-xs transition-colors ${
                      isPinned
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-600 hover:bg-indigo-100'
                        : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    {isPinned ? (
                      <><PinOff size={12} /><span>サイドバーのピンを外す</span></>
                    ) : (
                      <><Pin size={12} /><span>サイドバーにピン留め</span></>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* コメントタブ */}
            {activeTab === 'comments' && (
              <CommentsPanel
                documentId={numDocId}
                caseId={numCaseId}
              />
            )}

            {/* Wiki タブ */}
            {activeTab === 'wiki' && (
              <div className="h-full flex flex-col">
                <WikiEditor
                  doc={doc}
                  onSaved={(updated) => setDoc(updated)}
                />
              </div>
            )}

            {activeTab === 'ocr' && <OCRPanel doc={doc} />}

            {activeTab === 'summary' && (
              <SummaryPanel doc={doc} caseTitle={activeCase?.title ?? ''} />
            )}

            {activeTab === 'ai' && (
              <AIFlashPanel caseId={numCaseId} doc={doc} />
            )}

            {/* 出力タブ */}
            {activeTab === 'export' && (
              <ExportPanel
                doc={doc}
                caseTitle={activeCase?.title ?? ''}
                comments={comments}
              />
            )}

            {/* 履歴タブ */}
            {activeTab === 'activity' && (
              <ActivityPanel documentId={numDocId} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
