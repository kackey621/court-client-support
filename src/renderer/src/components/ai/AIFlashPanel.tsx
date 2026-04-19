import { useState, useRef, useEffect } from 'react'
import { Send, Trash2, Sparkles, AlertCircle } from 'lucide-react'
import type { AIMessage, Document } from '../../types'
import { useSettingsStore } from '../../store'
import {
  generateContent,
  askAboutDocument,
  type GeminiMessage
} from '../../services/geminiService'
import Spinner from '../shared/Spinner'

interface AIFlashPanelProps {
  caseId: number
  doc?: Document
}

export default function AIFlashPanel({ caseId, doc }: AIFlashPanelProps): JSX.Element {
  const [messages, setMessages] = useState<AIMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const { geminiApiKey, geminiModel } = useSettingsStore()

  useEffect(() => {
    async function loadHistory(): Promise<void> {
      const history = (await window.api.ai.getHistory(
        caseId,
        doc?.id
      )) as AIMessage[]
      setMessages(history)
    }
    loadHistory()
  }, [caseId, doc?.id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function send(): Promise<void> {
    const q = input.trim()
    if (!q || isLoading) return

    setInput('')
    setError(null)
    setIsLoading(true)

    const userMsg: AIMessage = {
      id: Date.now(),
      case_id: caseId,
      document_id: doc?.id ?? null,
      role: 'user',
      content: q,
      created_at: new Date().toISOString()
    }
    setMessages((prev) => [...prev, userMsg])
    await window.api.ai.saveMessage(caseId, doc?.id ?? null, 'user', q)

    try {
      const history: GeminiMessage[] = messages.map((m) => ({
        role: m.role,
        parts: [{ text: m.content }]
      }))

      let responseText: string
      if (doc) {
        const content = doc.ocr_text ?? doc.summary_text ?? ''
        responseText = await askAboutDocument(
          geminiApiKey,
          geminiModel,
          q,
          content,
          doc.title,
          history
        )
      } else {
        responseText = await generateContent(geminiApiKey, geminiModel, q, history)
      }

      const aiMsg: AIMessage = {
        id: Date.now() + 1,
        case_id: caseId,
        document_id: doc?.id ?? null,
        role: 'model',
        content: responseText,
        created_at: new Date().toISOString()
      }
      setMessages((prev) => [...prev, aiMsg])
      await window.api.ai.saveMessage(caseId, doc?.id ?? null, 'model', responseText)
    } catch (e) {
      setError((e as Error).message)
      setMessages((prev) => prev.filter((m) => m.id !== userMsg.id))
    } finally {
      setIsLoading(false)
    }
  }

  async function clearHistory(): Promise<void> {
    await window.api.ai.clearHistory(caseId, doc?.id)
    setMessages([])
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 uppercase tracking-wide">
          <Sparkles size={13} className="text-purple-500" />
          AI Flash
          {doc && (
            <span className="font-normal text-gray-400 normal-case">
              — {doc.title}
            </span>
          )}
        </div>
        {messages.length > 0 && (
          <button onClick={clearHistory} className="btn-secondary text-xs py-1">
            <Trash2 size={12} />
            クリア
          </button>
        )}
      </div>

      <div className="flex-1 overflow-auto space-y-3 mb-3 min-h-0">
        {messages.length === 0 && (
          <div className="text-xs text-gray-400 italic text-center py-4">
            {doc
              ? '文書について質問してください。OCRテキストや要約を参照して回答します。'
              : 'この案件について質問してください。'}
          </div>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white rounded-br-sm'
                  : 'bg-gray-100 text-gray-800 rounded-bl-sm'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-3.5 py-2.5">
              <Spinner size={14} className="text-gray-400" />
            </div>
          </div>
        )}
        {error && (
          <div className="flex items-center gap-1.5 text-xs text-red-600 bg-red-50 rounded-lg p-2.5">
            <AlertCircle size={13} />
            {error}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          send()
        }}
        className="flex items-end gap-2"
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              send()
            }
          }}
          placeholder="質問を入力... (Enter で送信, Shift+Enter で改行)"
          rows={2}
          className="input flex-1 resize-none text-xs"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="btn-primary py-2 px-3 self-end"
        >
          <Send size={14} />
        </button>
      </form>
    </div>
  )
}
