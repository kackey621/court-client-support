import { useState } from 'react'
import { Scale, Search, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react'
import { searchLaws, getLawContent, searchPrecedents, type LawListItem } from '../services/eGovService'
import Spinner from '../components/shared/Spinner'

export default function LawSearchPage(): JSX.Element {
  const [keyword, setKeyword] = useState('')
  const [laws, setLaws] = useState<LawListItem[]>([])
  const [precedents, setPrecedents] = useState<{ title: string; url: string }[]>([])
  const [selectedLaw, setSelectedLaw] = useState<LawListItem | null>(null)
  const [lawContent, setLawContent] = useState<string | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [isLoadingContent, setIsLoadingContent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<'laws' | 'precedents'>('laws')

  async function handleSearch(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    if (!keyword.trim()) return
    setIsSearching(true)
    setError(null)
    setSelectedLaw(null)
    setLawContent(null)
    try {
      const [lawResults, precedentResults] = await Promise.all([
        searchLaws(keyword),
        searchPrecedents(keyword)
      ])
      setLaws(lawResults)
      setPrecedents(precedentResults)
    } catch (e) {
      setError(`検索エラー: ${(e as Error).message}`)
    } finally {
      setIsSearching(false)
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

  const QUICK_SEARCHES = [
    '民法', '商法', '民事訴訟法', '労働契約法',
    '会社法', '不法行為', '損害賠償', '債権回収'
  ]

  return (
    <div className="space-y-5 max-w-4xl">
      <div>
        <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <Scale size={20} />
          法令・判例検索
        </h1>
        <p className="text-xs text-gray-400 mt-0.5">
          e-gov 法令API · 条文参照 · 判例リンク
        </p>
      </div>

      <form onSubmit={handleSearch} className="relative">
        <Search
          size={15}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
        />
        <input
          type="search"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="法令名・キーワードで検索..."
          className="input pl-10 pr-4 py-3 text-sm"
        />
      </form>

      <div className="flex flex-wrap gap-2">
        {QUICK_SEARCHES.map((q) => (
          <button
            key={q}
            onClick={() => {
              setKeyword(q)
              handleSearch({ preventDefault: () => {} } as React.FormEvent)
            }}
            className="px-3 py-1.5 bg-white border border-gray-200 rounded-full text-xs text-gray-700 hover:bg-gray-50 transition-colors"
          >
            {q}
          </button>
        ))}
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 rounded-lg p-3">{error}</div>
      )}

      {isSearching && (
        <div className="flex items-center justify-center py-12 text-gray-400 gap-2">
          <Spinner size={20} />
          <span className="text-sm">検索中...</span>
        </div>
      )}

      {(laws.length > 0 || precedents.length > 0) && !isSearching && (
        <div>
          <div className="flex border-b border-gray-200 mb-4">
            <button
              onClick={() => setTab('laws')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                tab === 'laws'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              法令 ({laws.length}件)
            </button>
            <button
              onClick={() => setTab('precedents')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                tab === 'precedents'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              判例検索リンク
            </button>
          </div>

          {tab === 'laws' && (
            <div className="space-y-2">
              {laws.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">
                  該当する法令が見つかりませんでした
                </p>
              ) : (
                laws.map((law) => (
                  <div key={law.law_id} className="card overflow-hidden">
                    <button
                      onClick={() => loadLawContent(law)}
                      className="w-full flex items-start justify-between p-4 text-left hover:bg-gray-50 transition-colors"
                    >
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{law.law_name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {law.law_num} ·{' '}
                          {law.promulgation_date &&
                            new Date(law.promulgation_date).toLocaleDateString('ja-JP')}
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
                ))
              )}
            </div>
          )}

          {tab === 'precedents' && (
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
