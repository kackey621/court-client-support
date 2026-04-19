import { useNavigate, useParams } from 'react-router-dom'
import { Search } from 'lucide-react'
import { useState } from 'react'
import { useCaseStore } from '../../store'

export default function TopBar(): JSX.Element {
  const { caseId } = useParams<{ caseId: string }>()
  const navigate = useNavigate()
  const activeCase = useCaseStore((s) => s.activeCase)
  const [query, setQuery] = useState('')

  function handleSearch(e: React.FormEvent): void {
    e.preventDefault()
    if (!query.trim()) return
    navigate(`/case/${caseId}/search?q=${encodeURIComponent(query.trim())}`)
    setQuery('')
  }

  return (
    <header className="h-12 bg-white border-b border-gray-200 flex items-center px-4 gap-4 flex-shrink-0">
      <div
        className="w-2 h-2 rounded-full flex-shrink-0"
        style={{ backgroundColor: activeCase?.color ?? '#6366f1' }}
      />
      <span className="text-sm font-semibold text-gray-700 truncate max-w-xs">
        {activeCase?.title ?? ''}
      </span>
      <form onSubmit={handleSearch} className="flex-1 max-w-md ml-auto">
        <div className="relative">
          <Search
            size={14}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="文書を検索..."
            className="input pl-8 py-1.5 text-xs h-8"
          />
        </div>
      </form>
    </header>
  )
}
