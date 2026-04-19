import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Eye, EyeOff, CheckCircle, AlertCircle,
  Pencil, X, Check
} from 'lucide-react'
import { useSettingsStore, useCaseStore } from '../store'
import type { Case } from '../types'

const CASE_COLORS = [
  '#6366f1', '#3b82f6', '#10b981', '#f59e0b',
  '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'
]

function CaseEditRow({ c, onSave }: { c: Case; onSave: (id: number, data: Partial<Case>) => Promise<void> }): JSX.Element {
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(c.title)
  const [description, setDescription] = useState(c.description ?? '')
  const [color, setColor] = useState(c.color)
  const [saving, setSaving] = useState(false)

  async function handleSave(): Promise<void> {
    setSaving(true)
    await onSave(c.id, { title: title.trim() || c.title, description: description || null, color })
    setSaving(false)
    setEditing(false)
  }

  function handleCancel(): void {
    setTitle(c.title)
    setDescription(c.description ?? '')
    setColor(c.color)
    setEditing(false)
  }

  if (!editing) {
    return (
      <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors group">
        <span
          className="w-3 h-3 rounded-full mt-1 flex-shrink-0 ring-2 ring-white ring-offset-1"
          style={{ backgroundColor: c.color }}
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-800">{c.title}</p>
          {c.description && (
            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{c.description}</p>
          )}
        </div>
        <button
          onClick={() => setEditing(true)}
          className="flex-shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-white opacity-0 group-hover:opacity-100 transition-all"
          title="編集"
        >
          <Pencil size={13} />
        </button>
      </div>
    )
  }

  return (
    <div className="p-4 rounded-xl border-2 border-blue-200 bg-blue-50 space-y-3">
      {/* タイトル */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">案件名</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="input text-sm"
          autoFocus
        />
      </div>

      {/* 説明 */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">説明</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="input text-sm resize-none"
          placeholder="案件の概要..."
        />
      </div>

      {/* カラー */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1.5">カラー</label>
        <div className="flex items-center gap-2 flex-wrap">
          {CASE_COLORS.map((col) => (
            <button
              key={col}
              onClick={() => setColor(col)}
              className={`w-6 h-6 rounded-full transition-transform ${
                color === col ? 'scale-125 ring-2 ring-offset-1 ring-gray-400' : 'hover:scale-110'
              }`}
              style={{ backgroundColor: col }}
            />
          ))}
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="w-6 h-6 rounded cursor-pointer border border-gray-200"
            title="カスタムカラー"
          />
        </div>
      </div>

      {/* ボタン */}
      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary text-xs flex items-center gap-1.5"
        >
          <Check size={12} />
          {saving ? '保存中...' : '保存'}
        </button>
        <button
          onClick={handleCancel}
          className="btn-secondary text-xs flex items-center gap-1.5"
        >
          <X size={12} />
          キャンセル
        </button>
      </div>
    </div>
  )
}

export default function SettingsPage(): JSX.Element {
  const navigate = useNavigate()
  const { geminiApiKey, geminiModel, ocrLanguage, setGeminiApiKey, setGeminiModel, setOcrLanguage } =
    useSettingsStore()
  const { cases, updateCase } = useCaseStore()

  const [apiKey, setApiKey] = useState(geminiApiKey)
  const [model, setModel] = useState(geminiModel)
  const [ocrLang, setOcrLang] = useState(ocrLanguage)
  const [showKey, setShowKey] = useState(false)
  const [saved, setSaved] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null)

  async function save(): Promise<void> {
    await setGeminiApiKey(apiKey)
    await setGeminiModel(model)
    await setOcrLanguage(ocrLang)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  async function testApiKey(): Promise<void> {
    if (!apiKey) return
    setTesting(true)
    setTestResult(null)
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: 'Hello, respond in Japanese in 5 words.' }] }]
          })
        }
      )
      if (res.ok) {
        setTestResult({ ok: true, msg: 'APIキーの接続に成功しました' })
      } else {
        const err = await res.json()
        setTestResult({
          ok: false,
          msg: `接続エラー: ${err?.error?.message ?? res.status}`
        })
      }
    } catch (e) {
      setTestResult({ ok: false, msg: `エラー: ${(e as Error).message}` })
    } finally {
      setTesting(false)
    }
  }

  const MODELS = [
    { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash（高速・無料枠あり）' },
    { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro（高性能）' },
    { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash（最新）' }
  ]

  const OCR_LANGS = [
    { value: 'jpn', label: '日本語' },
    { value: 'jpn+eng', label: '日本語 + 英語' },
    { value: 'eng', label: '英語のみ' }
  ]

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="text-gray-400 hover:text-gray-600"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">設定</h1>
            <p className="text-xs text-gray-400 mt-0.5">APIキー・OCR言語・案件情報の管理</p>
          </div>
        </div>

        {/* Gemini API */}
        <div className="card p-6 space-y-5">
          <h2 className="text-sm font-bold text-gray-800 border-b border-gray-100 pb-3">
            Google Gemini API
          </h2>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              APIキー
            </label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="input pr-10 font-mono text-sm"
              />
              <button
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1.5">
              Google AI Studio (aistudio.google.com) で取得できます
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              使用モデル
            </label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="input"
            >
              {MODELS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={testApiKey}
              disabled={!apiKey || testing}
              className="btn-secondary text-xs"
            >
              {testing ? '接続テスト中...' : '接続テスト'}
            </button>
            {testResult && (
              <div
                className={`flex items-center gap-1.5 text-xs ${
                  testResult.ok ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {testResult.ok ? (
                  <CheckCircle size={13} />
                ) : (
                  <AlertCircle size={13} />
                )}
                {testResult.msg}
              </div>
            )}
          </div>
        </div>

        {/* OCR */}
        <div className="card p-6 space-y-5">
          <h2 className="text-sm font-bold text-gray-800 border-b border-gray-100 pb-3">
            OCR設定
          </h2>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              OCR言語
            </label>
            <select
              value={ocrLang}
              onChange={(e) => setOcrLang(e.target.value)}
              className="input"
            >
              {OCR_LANGS.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-400 mt-1.5">
              初回OCR実行時に言語データを自動ダウンロードします（インターネット接続が必要）
            </p>
          </div>
        </div>

        {/* 案件編集 */}
        <div className="card p-6 space-y-4">
          <div className="border-b border-gray-100 pb-3">
            <h2 className="text-sm font-bold text-gray-800">案件情報</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              案件名・説明・カラーを編集できます。行にホバーして編集ボタンをクリック。
            </p>
          </div>
          <div className="space-y-2">
            {cases.map((c) => (
              <CaseEditRow
                key={c.id}
                c={c}
                onSave={updateCase}
              />
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-400">
            すべての設定はローカルデータベースに保存されます
          </p>
          <div className="flex items-center gap-2">
            {saved && (
              <div className="flex items-center gap-1.5 text-xs text-green-600">
                <CheckCircle size={13} />
                保存しました
              </div>
            )}
            <button onClick={save} className="btn-primary">
              保存
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
