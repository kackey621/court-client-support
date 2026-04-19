import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Search, Clock, TrendingUp, Pin, Lock, FileEdit, Paperclip,
  FileText, Image, File, ChevronRight, FolderOpen, Scale,
  BookOpen, ChevronDown, ChevronUp, ExternalLink
} from 'lucide-react'
import type { SearchResult, PinnedNavItem, Document } from '../types'
import { DOC_CATEGORIES } from '../types'
import { searchLaws, getLawContent, searchPrecedents, type LawListItem } from '../services/eGovService'
import Spinner from '../components/shared/Spinner'

type SearchScope = 'documents' | 'laws' | 'precedents'

const fileIcon = (type: string): JSX.Element => {
  if (type === 'pdf') return <FileText size={14} className="text-red-400 flex-shrink-0" />
  if (type === 'image') return <Image size={14} className="text-green-400 flex-shrink-0" />
  return <File size={14} className="text-gray-400 flex-shrink-0" />
}

const categoryBadge = (cat: string): JSX.Element => {
  const def = DOC_CATEGORIES[cat as keyof typeof DOC_CATEGORIES] ?? DOC_CATEGORIES.reference
  return (
    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${def.color}`}>
      {def.label}
    </span>
  )
}

const LAW_QUICK_SEARCHES = [
  '民法', '商法', '民事訴訟法', '労働契約法',
  '会社法', '不法行為', '損害賠償', '債権回収'
]

export default function SearchPage(): JSX.Element {
  const { caseId } = useParams<{ caseId: string }>()
  const navigate = useNavigate()
  const id = Number(caseId)

  const [scope, setScope] = useState<SearchScope>('documents')
  const [query, setQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ドキュメント検索
  const [results, setResults] = useState<SearchResult[]>([])
  const [recommendations, setRecommendations] = useState<string[]>([])
  const [history, setHistory] = useState<string[]>([])
  const [pinnedItems, setPinnedItems] = useState<PinnedNavItem[]>([])
  const [recentDocs, setRecentDocs] = useState<Document[]>([])

  // 法令検索
  const [laws, setLaws] = useState<LawListItem[]>([])
  const [selectedLaw, setSelectedLaw] = useState<LawListItem | null>(null)
  const [lawContent, setLawContent] = useState<string | null>(null)
  const [isLoadingContent, setIsLoadingContent] = useState(false)

  // 判例検索
  const [precedents, setPrecedents] = useState<{ title: string; url: string }[]>([])

  useEffect(() => {
    loadDashboard()
  }, [caseId])

  async function loadDashboard(): Promise<void> {
    const [recs, hist, pinned, recent] = await Promise.all([
      window.api.search.recommendations(id, 8) as Promise<string[]>,
      window.api.search.history(id, 10) as Promise<{ query: string }[]>,
      window.api.pinned.list(id) as Promise<PinnedNavItem[]>,
      window.api.documents.list(id, {}) as Promise<Document[]>
    ])
    setRecommendations(recs)
    setHistory([...new Set(hist.map((h) => h.query))].slice(0, 6))
    setPinnedItems(pinned)
    const sorted = [...recent].sort(
      (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    )
    setRecentDocs(sorted.slice(0, 8))
  }

  async function doSearch(q: string, targetScope: SearchScope = scope): Promise<void> {
    if (!q.trim()) {
      setHasSearched(false)
      return
    }
    setIsSearching(true)
    setHasSearched(true)
    setError(null)
    try {
      if (targetScope === 'documents') {
        const res = (await window.api.search.ftsQuery(q, id, 50)) as SearchResult[]
        setResults(res)
        await window.api.search.log(q, res.length, id)
      } else if (targetScope === 'laws') {
        setSelectedLaw(null)
        setLawContent(null)
        const lawResults = await searchLaws(q)
        setLaws(lawResults)
      } else {
        const precedentResults = await searchPrecedents(q)
        setPrecedents(precedentResults)
      }
    } catch (e) {
      setError(`検索エラー: ${(e as Error).message}`)
    } finally {
      setIsSearching(false)
    }
  }

  function handleSubmit(e: React.FormEvent): void {
    e.preventDefault()
    doSearch(query)
  }

  function handleQueryChange(val: string): void {
    setQuery(val)
    if (!val.trim()) {
      setHasSearched(false)
      setResults([])
      setLaws([])
      setPrecedents([])
    }
  }

  function handleScopeChange(s: SearchScope): void {
    setScope(s)
    setError(null)
    if (query.trim() && hasSearched) {
      doSearch(query, s)
    } else {
      setHasSearched(false)
    }
  }

  async function loadLawContent(law: LawListItem): Promise<void> {
    if (selectedLaw?.law_id === law.law_id) {
      setSelectedLaw(null)
      setLawContent(null)
      return
    }
    setSelectedLaw(law)
    setIsLoadingContent(true)
    try {
      const content = await getLawContent(law.law_id)
      setLawContent(content)
    } catch (e) {
      setLawContent(`内容を取得できませんでした: ${(e as Error).message}`)
    } finally {
      setIsLoadingContent(false)
    }
  }

  const scopeTabs: { id: SearchScope; label: string; Icon: typeof Search; desc: string }[] = [
    { id: 'documents', label: 'ドキュメント', Icon: FolderOpen, desc: '案件内の全文検索' },
    { id: 'laws', label: '法令', Icon: Scale, desc: 'e-gov 法令検索' },
    { id: 'precedents', label: '判例', Icon: BookOpen, desc: '外部判例検索リンク' }
  ]

  const placeholder = scope === 'documents'
    ? 'キーワードを入力して案件内を全文検索...'
    : scope === 'laws'
      ? '法令名・キーワードで検索（例: 民法、労働契約法）...'
      : 'キーワードで判例検索リンクを生成...'

  return (
    <div className="space-y-5 max-w-4xl">
      {/* ヘッダー */}
      <div>
        <h1 className="text-lg font-bold text-gray-900">検索</h1>
        <p className="text-xs text-gray-400 mt-0.5">ドキュメント・法令・判例を横断検索</p>
      </div>

      {/* 検索対象タブ */}
      <div className="grid grid-cols-3 gap-1.5 p-1 bg-gray-100 rounded-xl">
        {scopeTabs.map((t) => {
          const active = scope === t.id
          return (
            <button
              key={t.id}
              onClick={() => handleScopeChange(t.id)}
              className={`flex flex-col items-center gap-1 px-3 py-2.5 rounded-lg transition-all ${
                active
                  ? 'bg-white shadow-sm text-blue-600'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-white/60'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <t.Icon size={14} />
                <span className="text-xs font-semibold">{t.label}</span>
              </div>
              <span className={`text-xs leading-tight ${active ? 'text-blue-500' : 'text-gray-400'}`}>
                {t.desc}
              </span>
            </button>
          )
        })}
      </div>

      {/* 検索バー */}
      <form onSubmit={handleSubmit} className="relative">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="search"
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          placeholder={placeholder}
          className="input pl-11 pr-4 py-3 text-sm shadow-sm"
          autoFocus
        />
        {query && (
          <button
            type="submit"
            className="absolute right-3 top-1/2 -translate-y-1/2 btn-primary text-xs py-1.5 px-3"
          >
            検索
          </button>
        )}
      </form>

      {/* 法令タブ：クイック検索 */}
      {scope === 'laws' && !hasSearched && (
        <section>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            <TrendingUp size={12} />
            よく使う法令
          </div>
          <div className="flex flex-wrap gap-2">
            {LAW_QUICK_SEARCHES.map((q) => (
              <button
                key={q}
                onClick={() => {
                  setQuery(q)
                  doSearch(q, 'laws')
                }}
                className="px-3 py-1.5 bg-white border border-gray-200 rounded-full text-xs text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
          <div className="mt-4 flex items-start gap-3 p-3 bg-blue-50 border border-blue-100 rounded-xl">
            <Scale size={15} className="text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-blue-900 leading-relaxed">
              e-gov 法令API v2 から条文を取得し、本文のコピーや e-gov 公式ページへの移動が可能です。
            </div>
          </div>
        </section>
      )}

      {/* 判例タブ：ヒント */}
      {scope === 'precedents' && !hasSearched && (
        <section className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl flex items-start gap-3">
          <BookOpen size={15} className="text-indigo-500 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-indigo-900 leading-relaxed">
            キーワードを入力すると、<span className="font-semibold">最高裁判所 判例検索</span>や
            <span className="font-semibold"> D1-Law</span> などの外部判例検索サイトへのリンクを生成します。
          </div>
        </section>
      )}

      {/* ドキュメントタブ：ダッシュボード */}
      {scope === 'documents' && !hasSearched && (
        <div className="space-y-6">
          {/* ピン留め */}
          {pinnedItems.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Pin size={13} className="text-indigo-400" />
                <h2 className="text-xs font-bold text-gray-700 uppercase tracking-wide">ピン留め</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {pinnedItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => navigate(`/case/${caseId}/documents/${item.document_id}`)}
                    className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-xl hover:border-indigo-300 hover:shadow-sm transition-all text-left group"
                  >
                    {fileIcon(item.file_type)}
                    <span className="flex-1 text-sm font-medium text-gray-800 truncate">
                      {item.title}
                    </span>
                    {categoryBadge(item.doc_category)}
                    {item.is_locked === 1 && (
                      <Lock size={11} className="text-red-400 flex-shrink-0" />
                    )}
                    <ChevronRight
                      size={13}
                      className="text-gray-300 group-hover:text-indigo-400 flex-shrink-0 transition-colors"
                    />
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* カテゴリクイックアクセス */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <FolderOpen size={13} className="text-gray-400" />
              <h2 className="text-xs font-bold text-gray-700 uppercase tracking-wide">
                カテゴリ別に見る
              </h2>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                {
                  cat: 'evidence',
                  label: '証拠文書',
                  desc: '削除・変更不可の重要証拠',
                  Icon: Lock,
                  bg: 'bg-red-50 border-red-100 hover:border-red-300',
                  icon: 'text-red-500'
                },
                {
                  cat: 'working',
                  label: '作業文書',
                  desc: '要約・インデックス・分析',
                  Icon: FileEdit,
                  bg: 'bg-blue-50 border-blue-100 hover:border-blue-300',
                  icon: 'text-blue-500'
                },
                {
                  cat: 'reference',
                  label: '参考文書',
                  desc: '参考資料・添付ファイル',
                  Icon: Paperclip,
                  bg: 'bg-gray-50 border-gray-200 hover:border-gray-400',
                  icon: 'text-gray-500'
                }
              ].map(({ cat, label, desc, Icon, bg, icon }) => (
                <button
                  key={cat}
                  onClick={() => navigate(`/case/${caseId}/documents?category=${cat}`)}
                  className={`flex flex-col items-start gap-2 p-4 border rounded-xl transition-all text-left ${bg}`}
                >
                  <Icon size={18} className={icon} />
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{label}</p>
                    <p className="text-xs text-gray-400 mt-0.5 leading-tight">{desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </section>

          {/* 最近のドキュメント */}
          {recentDocs.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Clock size={13} className="text-gray-400" />
                  <h2 className="text-xs font-bold text-gray-700 uppercase tracking-wide">
                    最近のドキュメント
                  </h2>
                </div>
                <button
                  onClick={() => navigate(`/case/${caseId}/documents`)}
                  className="text-xs text-blue-500 hover:text-blue-700 flex items-center gap-0.5"
                >
                  すべて見る <ChevronRight size={12} />
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {recentDocs.map((doc) => (
                  <button
                    key={doc.id}
                    onClick={() => navigate(`/case/${caseId}/documents/${doc.id}`)}
                    className="flex flex-col gap-2 p-3 bg-white border border-gray-200 rounded-xl hover:border-gray-300 hover:shadow-sm transition-all text-left group"
                  >
                    <div className="flex items-center justify-between">
                      {fileIcon(doc.file_type)}
                      {doc.is_locked === 1 && (
                        <Lock size={10} className="text-red-300" />
                      )}
                    </div>
                    <p className="text-xs font-medium text-gray-800 line-clamp-2 leading-tight">
                      {doc.title}
                    </p>
                    <span className={`text-xs px-1.5 py-0.5 rounded self-start font-medium ${
                      DOC_CATEGORIES[doc.doc_category as keyof typeof DOC_CATEGORIES]?.color ?? 'bg-gray-100 text-gray-600'
                    }`}>
                      {DOC_CATEGORIES[doc.doc_category as keyof typeof DOC_CATEGORIES]?.label ?? '参考文書'}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* 検索ヒント */}
          <div className="space-y-4">
            {recommendations.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  <TrendingUp size={12} />
                  よく使う検索
                </div>
                <div className="flex flex-wrap gap-2">
                  {recommendations.map((r, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setQuery(r)
                        doSearch(r)
                      }}
                      className="px-3 py-1.5 bg-white border border-gray-200 rounded-full text-xs text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors"
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {history.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  <Clock size={12} />
                  最近の検索
                </div>
                <div className="space-y-1">
                  {history.map((h, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setQuery(h)
                        doSearch(h)
                      }}
                      className="flex items-center gap-2 w-full text-left px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-white hover:shadow-sm transition-all"
                    >
                      <Clock size={12} className="text-gray-300" />
                      {h}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* エラー */}
      {error && (
        <div className="text-sm text-red-600 bg-red-50 rounded-lg p-3">{error}</div>
      )}

      {/* 検索中 */}
      {isSearching && (
        <div className="flex items-center gap-2 text-gray-400 py-8 justify-center">
          <Spinner size={20} />
          <span className="text-sm">検索中...</span>
        </div>
      )}

      {/* ドキュメント検索結果 */}
      {scope === 'documents' && hasSearched && !isSearching && (
        <div>
          <p className="text-xs text-gray-500 mb-3">
            「{query}」で <span className="font-semibold">{results.length}件</span>見つかりました
          </p>
          {results.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm space-y-3">
              <p>該当する文書が見つかりませんでした</p>
              <div className="flex justify-center gap-2 pt-2">
                <button
                  onClick={() => handleScopeChange('laws')}
                  className="btn-secondary text-xs"
                >
                  <Scale size={12} /> 法令で検索
                </button>
                <button
                  onClick={() => handleScopeChange('precedents')}
                  className="btn-secondary text-xs"
                >
                  <BookOpen size={12} /> 判例で検索
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {results.map((doc) => (
                <button
                  key={doc.id}
                  onClick={() => navigate(`/case/${caseId}/documents/${doc.id}`)}
                  className="w-full text-left bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md hover:border-gray-300 transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5 min-w-0">
                      {fileIcon(doc.file_type)}
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{doc.title}</p>
                        <p className="text-xs text-gray-400 mt-0.5 truncate">{doc.file_name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {categoryBadge(doc.doc_category)}
                      {doc.is_locked === 1 && (
                        <Lock size={12} className="text-red-400" />
                      )}
                    </div>
                  </div>
                  {doc.snippet && (
                    <p
                      className="text-xs text-gray-500 mt-2.5 leading-relaxed line-clamp-2 pl-5"
                      dangerouslySetInnerHTML={{ __html: doc.snippet }}
                    />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 法令検索結果 */}
      {scope === 'laws' && hasSearched && !isSearching && (
        <div>
          <p className="text-xs text-gray-500 mb-3">
            「{query}」で <span className="font-semibold">{laws.length}件</span>の法令が見つかりました
          </p>
          {laws.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">
              該当する法令が見つかりませんでした
            </div>
          ) : (
            <div className="space-y-2">
              {laws.map((law) => (
                <div key={law.law_id} className="card overflow-hidden">
                  <button
                    onClick={() => loadLawContent(law)}
                    className="w-full flex items-start justify-between p-4 text-left hover:bg-gray-50 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{law.law_name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {law.law_num}
                        {law.promulgation_date &&
                          ' · ' + new Date(law.promulgation_date).toLocaleDateString('ja-JP')}
                      </p>
                    </div>
                    {selectedLaw?.law_id === law.law_id ? (
                      <ChevronUp size={16} className="text-gray-400 flex-shrink-0 mt-0.5" />
                    ) : (
                      <ChevronDown size={16} className="text-gray-400 flex-shrink-0 mt-0.5" />
                    )}
                  </button>

                  {selectedLaw?.law_id === law.law_id && (
                    <div className="border-t border-gray-100 bg-gray-50 p-4">
                      {isLoadingContent ? (
                        <div className="flex items-center gap-2 text-gray-400 py-4">
                          <Spinner size={16} />
                          <span className="text-xs">読み込み中...</span>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2">
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                if (lawContent) window.api.shell.copyText(lawContent)
                              }}
                              className="btn-secondary text-xs py-1"
                            >
                              テキストをコピー
                            </button>
                            <button
                              onClick={() =>
                                window.api.shell.openExternal(
                                  `https://laws.e-gov.go.jp/law/${law.law_id}`
                                )
                              }
                              className="btn-secondary text-xs py-1"
                            >
                              <ExternalLink size={12} />
                              e-govで開く
                            </button>
                          </div>
                          <pre className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap max-h-80 overflow-auto bg-white rounded-lg p-3 border border-gray-200">
                            {lawContent}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 判例検索結果 */}
      {scope === 'precedents' && hasSearched && !isSearching && (
        <div>
          <p className="text-xs text-gray-500 mb-3">「{query}」の判例検索リンク</p>
          {precedents.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">
              該当する判例リンクがありません
            </div>
          ) : (
            <div className="space-y-2">
              {precedents.map((p, i) => (
                <button
                  key={i}
                  onClick={() => window.api.shell.openExternal(p.url)}
                  className="w-full card p-4 flex items-center justify-between text-left hover:shadow-md hover:border-gray-300 transition-all"
                >
                  <span className="text-sm text-gray-800">{p.title}</span>
                  <ExternalLink size={14} className="text-gray-400 flex-shrink-0 ml-2" />
                </button>
              ))}
              <p className="text-xs text-gray-400 text-center py-2">
                各リンクをクリックすると外部サイトで判例を検索できます
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
