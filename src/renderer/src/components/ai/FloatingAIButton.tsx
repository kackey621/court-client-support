import { useState, useEffect, useRef } from 'react'
import { Sparkles, X, Minimize2 } from 'lucide-react'
import { useCaseStore, useSettingsStore } from '../../store'
import AIFlashPanel from './AIFlashPanel'

export default function FloatingAIButton(): JSX.Element {
  const [open, setOpen] = useState(false)
  const [minimized, setMinimized] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const activeCaseId = useCaseStore((s) => s.activeCaseId)
  const activeCase = useCaseStore((s) => s.activeCase)
  const { geminiApiKey } = useSettingsStore()

  // Esc で閉じる
  useEffect(() => {
    function onKey(e: KeyboardEvent): void {
      if (e.key === 'Escape' && open) setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <>
      {/* フローティングボタン */}
      <button
        onClick={() => {
          setOpen(true)
          setMinimized(false)
        }}
        className={`fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-2.5 rounded-full shadow-lg
          transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-400
          ${open && !minimized
            ? 'bg-purple-700 text-white scale-95'
            : 'bg-purple-600 hover:bg-purple-700 text-white hover:scale-105'
          }`}
        title="AI Flash を開く (Ctrl+Space)"
      >
        <Sparkles size={16} className={open && !minimized ? 'animate-spin' : ''} />
        <span className="text-xs font-semibold">AI Flash</span>
      </button>

      {/* スライドインパネル */}
      <div
        className={`fixed right-0 top-0 bottom-0 z-50 flex flex-col bg-white border-l border-gray-200 shadow-2xl
          transition-all duration-300 ease-in-out
          ${open ? 'translate-x-0' : 'translate-x-full'}
          ${minimized ? 'h-12 top-auto bottom-20 rounded-tl-xl border-t' : 'w-96'}`}
        ref={panelRef}
      >
        {/* ヘッダー */}
        <div
          className="flex items-center justify-between px-4 py-3 border-b border-gray-100 flex-shrink-0 cursor-pointer"
          style={{ backgroundColor: activeCase?.color ? `${activeCase.color}18` : '#f5f3ff' }}
          onClick={() => minimized && setMinimized(false)}
        >
          <div className="flex items-center gap-2">
            <Sparkles size={15} className="text-purple-600" />
            <span className="text-sm font-semibold text-gray-800">AI Flash</span>
            {activeCase && (
              <span
                className="text-xs px-2 py-0.5 rounded-full text-white font-medium"
                style={{ backgroundColor: activeCase.color }}
              >
                {activeCase.title.slice(0, 10)}…
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => { e.stopPropagation(); setMinimized(!minimized) }}
              className="p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              title="最小化"
            >
              <Minimize2 size={14} />
            </button>
            <button
              onClick={() => setOpen(false)}
              className="p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              title="閉じる"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* コンテンツ */}
        {!minimized && (
          <div className="flex-1 overflow-hidden p-4">
            {geminiApiKey ? (
              <AIFlashPanel caseId={activeCaseId} />
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
                <Sparkles size={32} className="text-purple-200" />
                <p className="text-sm text-gray-500">
                  AI Flash を使用するには<br />Gemini API キーが必要です
                </p>
                <a
                  href="#/settings"
                  onClick={() => setOpen(false)}
                  className="btn-primary text-xs"
                >
                  設定画面へ
                </a>
              </div>
            )}
          </div>
        )}
      </div>

      {/* オーバーレイ（クリックで閉じる） */}
      {open && !minimized && (
        <div
          className="fixed inset-0 z-40 bg-black/10"
          onClick={() => setOpen(false)}
        />
      )}
    </>
  )
}
