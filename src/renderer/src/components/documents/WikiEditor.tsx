import { useState, useEffect, useRef } from 'react'
import { Eye, Edit3, Save, BookOpen } from 'lucide-react'
import type { Document } from '../../types'

interface Props {
  doc: Document
  onSaved?: (updated: Document) => void
}

/** 簡易Markdownレンダラー（外部ライブラリ不要） */
function renderMarkdown(text: string): string {
  let html = text
    // HTML エスケープ
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // 見出し
    .replace(/^### (.+)$/gm, '<h3 class="text-sm font-bold text-gray-800 mt-4 mb-1.5">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-base font-bold text-gray-900 mt-5 mb-2 border-b border-gray-200 pb-1">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-lg font-bold text-gray-900 mt-6 mb-2">$1</h1>')
    // 太字・斜体
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em class="italic">$1</em>')
    // インラインコード
    .replace(
      /`(.+?)`/g,
      '<code class="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono text-red-700">$1</code>'
    )
    // 打ち消し線
    .replace(/~~(.+?)~~/g, '<del class="text-gray-400">$1</del>')
    // 水平線
    .replace(/^---$/gm, '<hr class="border-t border-gray-200 my-3" />')
    // 引用
    .replace(
      /^&gt; (.+)$/gm,
      '<blockquote class="border-l-3 border-gray-300 pl-3 text-gray-600 italic my-2">$1</blockquote>'
    )
    // チェックボックスリスト
    .replace(/^- \[x\] (.+)$/gm, '<li class="flex items-start gap-1.5 ml-4 text-gray-400 line-through"><span>☑</span><span>$1</span></li>')
    .replace(/^- \[ \] (.+)$/gm, '<li class="flex items-start gap-1.5 ml-4"><span>☐</span><span>$1</span></li>')
    // 箇条書き
    .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc list-inside">$1</li>')
    .replace(/^\d+\. (.+)$/gm, '<li class="ml-4 list-decimal list-inside">$1</li>')
    // 段落 & 改行
    .replace(/\n\n/g, '</p><p class="mb-2 text-xs leading-relaxed text-gray-700">')
    .replace(/\n/g, '<br />')

  return `<p class="mb-2 text-xs leading-relaxed text-gray-700">${html}</p>`
}

const PLACEHOLDER = `# タイトル

## 概要
ここに文書の概要や論点を記載...

## 重要ポイント
- 重要な事実1
- 重要な事実2

## メモ
> 引用・注釈はこのように書きます

---

**太字** や *斜体* も使えます。`

export default function WikiEditor({ doc, onSaved }: Props): JSX.Element {
  const [content, setContent] = useState(doc.wiki_content ?? '')
  const [mode, setMode] = useState<'edit' | 'preview'>('edit')
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [dirty, setDirty] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // ドキュメント切り替え時にリセット
  useEffect(() => {
    setContent(doc.wiki_content ?? '')
    setDirty(false)
    setSavedAt(null)
  }, [doc.id])

  function handleChange(val: string): void {
    setContent(val)
    setDirty(true)
  }

  async function handleSave(): Promise<void> {
    setSaving(true)
    try {
      const updated = (await window.api.documents.setWiki(doc.id, content)) as Document
      setSavedAt(new Date())
      setDirty(false)
      onSaved?.(updated)
    } finally {
      setSaving(false)
    }
  }

  // Tab キーでインデント
  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>): void {
    if (e.key === 'Tab') {
      e.preventDefault()
      const ta = textareaRef.current
      if (!ta) return
      const start = ta.selectionStart
      const end = ta.selectionEnd
      const newVal = content.substring(0, start) + '  ' + content.substring(end)
      setContent(newVal)
      setDirty(true)
      // カーソル位置を調整
      requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = start + 2
      })
    }
    // Ctrl/Cmd + S で保存
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault()
      handleSave()
    }
  }

  return (
    <div className="flex flex-col h-full space-y-2">
      {/* ツールバー */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
          <button
            onClick={() => setMode('edit')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
              mode === 'edit'
                ? 'bg-white shadow-sm text-gray-900'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Edit3 size={11} />
            編集
          </button>
          <button
            onClick={() => setMode('preview')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
              mode === 'preview'
                ? 'bg-white shadow-sm text-gray-900'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Eye size={11} />
            プレビュー
          </button>
        </div>

        <button
          onClick={handleSave}
          disabled={saving || !dirty}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
            dirty
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
        >
          <Save size={11} />
          {saving ? '保存中...' : '保存'}
        </button>
      </div>

      {/* 保存時刻 */}
      {savedAt && !dirty && (
        <p className="text-xs text-green-600 flex-shrink-0">
          ✓ {savedAt.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })} に保存
        </p>
      )}
      {dirty && (
        <p className="text-xs text-amber-500 flex-shrink-0">未保存の変更があります（⌘S で保存）</p>
      )}

      {/* エディタ / プレビュー */}
      <div className="flex-1 min-h-0">
        {mode === 'edit' ? (
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => handleChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={PLACEHOLDER}
            className="w-full h-full resize-none text-xs font-mono text-gray-800 bg-gray-50 border border-gray-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-300 leading-relaxed"
            style={{ minHeight: '300px' }}
          />
        ) : (
          <div
            className="w-full h-full overflow-y-auto bg-white border border-gray-200 rounded-lg p-3"
            style={{ minHeight: '300px' }}
          >
            {content.trim() ? (
              <div
                className="prose-like"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-32 text-gray-300">
                <BookOpen size={28} className="mb-2" />
                <p className="text-xs">編集タブにテキストを入力するとプレビューに表示されます</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Markdown ヒント */}
      {mode === 'edit' && (
        <div className="flex-shrink-0 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-400 pt-1">
          {[
            ['# H1', '## H2'],
            ['**太字**', '*斜体*'],
            ['- リスト', '> 引用'],
            ['`コード`', '---']
          ].map((pair, i) => (
            <span key={i}>
              {pair[0]}
              <span className="mx-1 text-gray-200">·</span>
              {pair[1]}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
