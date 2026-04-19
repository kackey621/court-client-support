import { useState } from 'react'
import { Wand2, Copy, CheckCircle, AlertCircle } from 'lucide-react'
import type { Document } from '../../types'
import { useDocumentStore, useSettingsStore } from '../../store'
import { summarizeDocument } from '../../services/geminiService'
import Spinner from '../shared/Spinner'

interface SummaryPanelProps {
  doc: Document
  caseTitle: string
}

export default function SummaryPanel({ doc, caseTitle }: SummaryPanelProps): JSX.Element {
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const saveSummary = useDocumentStore((s) => s.saveSummary)
  const { geminiApiKey, geminiModel } = useSettingsStore()

  const content = doc.ocr_text ?? ''

  async function generate(): Promise<void> {
    if (!content && !doc.title) return
    setIsGenerating(true)
    setError(null)
    try {
      const summary = await summarizeDocument(
        geminiApiKey,
        geminiModel,
        doc.title,
        content,
        caseTitle
      )
      await saveSummary(doc.id, summary)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setIsGenerating(false)
    }
  }

  async function copySummary(): Promise<void> {
    if (!doc.summary_text) return
    await window.api.shell.copyText(doc.summary_text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
          AI要約
        </h3>
        <div className="flex items-center gap-1.5">
          {doc.summary_text && (
            <button onClick={copySummary} className="btn-secondary text-xs py-1">
              {copied ? (
                <CheckCircle size={12} className="text-green-500" />
              ) : (
                <Copy size={12} />
              )}
              {copied ? 'コピー済' : 'コピー'}
            </button>
          )}
          <button
            onClick={generate}
            disabled={isGenerating || !geminiApiKey}
            className="btn-primary text-xs py-1"
            title={!geminiApiKey ? 'APIキーを設定してください' : undefined}
          >
            {isGenerating ? <Spinner size={12} /> : <Wand2 size={12} />}
            {isGenerating ? '生成中...' : doc.summary_text ? '再生成' : '要約生成'}
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-1.5 text-xs text-red-600 bg-red-50 rounded-lg p-2.5">
          <AlertCircle size={13} />
          {error}
        </div>
      )}

      {doc.summary_text ? (
        <div className="text-xs text-gray-700 leading-relaxed bg-gray-50 rounded-lg p-3 whitespace-pre-wrap">
          {doc.summary_text}
        </div>
      ) : (
        <div className="text-xs text-gray-400 italic py-2">
          {geminiApiKey
            ? 'OCRテキストから要約を生成します。先にOCRを実行してください。'
            : '設定画面でGemini APIキーを設定してください。'}
        </div>
      )}
    </div>
  )
}
