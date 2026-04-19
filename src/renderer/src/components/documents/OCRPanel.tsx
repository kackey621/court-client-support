import { useEffect, useRef, useState } from 'react'
import { ScanText, Copy, CheckCircle, AlertCircle, FileDown, RefreshCw } from 'lucide-react'
import type { Document } from '../../types'
import Spinner from '../shared/Spinner'

interface OCRPanelProps {
  doc: Document
}

type OcrStatus = 'pending' | 'running' | 'done' | 'error'

const STATUS_LABEL: Record<OcrStatus, string> = {
  pending: '待機中（キューに登録済み）',
  running: '処理中',
  done: '完了',
  error: 'エラー'
}

const STATUS_COLOR: Record<OcrStatus, string> = {
  pending: 'text-amber-600 bg-amber-50 border-amber-200',
  running: 'text-blue-600 bg-blue-50 border-blue-200',
  done: 'text-green-600 bg-green-50 border-green-200',
  error: 'text-red-600 bg-red-50 border-red-200'
}

export default function OCRPanel({ doc }: OCRPanelProps): JSX.Element {
  const [status, setStatus] = useState<OcrStatus>((doc.ocr_status as OcrStatus) ?? 'pending')
  const [text, setText] = useState<string>(doc.ocr_text ?? '')
  const [errorMsg, setErrorMsg] = useState<string | null>(doc.ocr_error ?? null)
  const [progress, setProgress] = useState<number>(0)
  const [progressMsg, setProgressMsg] = useState<string>('')
  const [available, setAvailable] = useState<boolean | null>(null)
  const [copied, setCopied] = useState(false)
  const [exporting, setExporting] = useState(false)
  const initializedDocId = useRef<number>(doc.id)

  // doc 切替時にリセット
  useEffect(() => {
    initializedDocId.current = doc.id
    setStatus((doc.ocr_status as OcrStatus) ?? 'pending')
    setText(doc.ocr_text ?? '')
    setErrorMsg(doc.ocr_error ?? null)
    setProgress(0)
    setProgressMsg('')
  }, [doc.id, doc.ocr_status, doc.ocr_text, doc.ocr_error])

  // NDLOCR-Lite 可用性チェック
  useEffect(() => {
    void window.api.ocr.isAvailable().then(setAvailable)
  }, [])

  // 進捗イベントの購読
  useEffect(() => {
    const offProgress = window.api.ocr.onProgress((p) => {
      if (p.docId !== initializedDocId.current) return
      setProgress(Math.round(p.progress * 100))
      setProgressMsg(p.message)
    })
    const offStatus = window.api.ocr.onStatus(async (s) => {
      if (s.docId !== initializedDocId.current) return
      setStatus(s.status)
      if (s.status === 'running') {
        setProgress(s.progress ?? 0)
        setErrorMsg(null)
      } else if (s.status === 'done') {
        setProgress(100)
        setErrorMsg(null)
        // テキスト再取得
        const fresh = await window.api.documents.get(initializedDocId.current)
        setText(fresh.ocr_text ?? '')
      } else if (s.status === 'error') {
        setErrorMsg(s.error ?? 'OCR に失敗しました')
      }
    })
    return () => {
      offProgress()
      offStatus()
    }
  }, [])

  const canOcr = doc.file_type === 'image' || doc.file_type === 'pdf'

  async function copyOcrText(): Promise<void> {
    if (!text) return
    await window.api.shell.copyText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function enqueueNow(): Promise<void> {
    await window.api.ocr.enqueue(doc.id)
    setStatus('pending')
    setErrorMsg(null)
    setProgress(0)
    setProgressMsg('キューに登録しました')
  }

  async function exportAsTxt(): Promise<void> {
    if (!text) return
    setExporting(true)
    try {
      const buffer = new TextEncoder().encode(text).buffer
      const safeName = doc.title.replace(/[\\/:*?"<>|]/g, '_').slice(0, 60)
      await window.api.fs.saveFile(buffer, `${safeName}_OCR.txt`, [
        { name: 'テキストファイル', extensions: ['txt'] }
      ])
    } finally {
      setExporting(false)
    }
  }

  if (!canOcr) {
    return (
      <div className="text-xs text-gray-400 italic py-4 text-center">
        この文書タイプは OCR 対象外です（PDF / 画像のみ対応）
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
          OCRテキスト
          <span className="ml-1.5 text-xs font-normal text-gray-400">NDLOCR-Lite</span>
        </h3>
        <div className="flex items-center gap-1.5">
          {text && (
            <>
              <button onClick={copyOcrText} className="btn-secondary text-xs py-1" title="コピー">
                {copied ? <CheckCircle size={12} className="text-green-500" /> : <Copy size={12} />}
                {copied ? 'コピー済' : 'コピー'}
              </button>
              <button
                onClick={exportAsTxt}
                disabled={exporting}
                className="btn-secondary text-xs py-1"
                title=".txt で保存"
              >
                <FileDown size={12} />
                .txt
              </button>
            </>
          )}
          <button
            onClick={enqueueNow}
            disabled={status === 'running' || status === 'pending'}
            className="btn-primary text-xs py-1"
            title="OCR を再実行"
          >
            {status === 'running' ? (
              <>
                <Spinner size={12} />
                処理中 {progress}%
              </>
            ) : status === 'pending' ? (
              <>
                <Spinner size={12} />
                待機中
              </>
            ) : (
              <>
                <RefreshCw size={12} />
                {text ? '再実行' : '実行'}
              </>
            )}
          </button>
        </div>
      </div>

      {/* ステータスバッジ */}
      <div className={`text-xs px-2.5 py-1.5 rounded-lg border flex items-center gap-2 ${STATUS_COLOR[status]}`}>
        {status === 'running' ? (
          <Spinner size={11} />
        ) : status === 'error' ? (
          <AlertCircle size={11} />
        ) : status === 'done' ? (
          <CheckCircle size={11} />
        ) : (
          <ScanText size={11} />
        )}
        <span className="font-medium">{STATUS_LABEL[status]}</span>
        {progressMsg && status === 'running' && (
          <span className="text-gray-500 truncate">— {progressMsg}</span>
        )}
      </div>

      {/* プログレスバー */}
      {status === 'running' && (
        <div className="w-full bg-gray-100 rounded-full h-1.5">
          <div
            className="bg-blue-500 h-1.5 rounded-full transition-all duration-200"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* エラー */}
      {status === 'error' && errorMsg && (
        <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg p-2.5 leading-relaxed">
          {errorMsg}
        </div>
      )}

      {/* NDLOCR 未セットアップ警告 */}
      {available === false && status !== 'done' && (
        <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2.5 leading-relaxed">
          NDLOCR-Lite がセットアップされていません。<br />
          <code className="text-xs">scripts/build-ndlocr.sh</code> を実行してバイナリをビルドしてください
          （詳細: <code>python/README.md</code>）。
        </div>
      )}

      {/* OCR 結果 */}
      {text ? (
        <textarea
          readOnly
          value={text}
          rows={10}
          className="input resize-none text-xs font-mono leading-relaxed"
        />
      ) : status === 'done' ? (
        <div className="text-xs text-gray-400 italic py-2">
          テキストが抽出されませんでした（空のページの可能性）
        </div>
      ) : status === 'pending' || status === 'running' ? (
        <div className="text-xs text-gray-400 italic py-2">
          インポート時に自動でキューに登録されました。順次バックグラウンドで処理されます。
        </div>
      ) : (
        <div className="text-xs text-gray-400 italic py-2">
          「実行」をクリックして OCR を開始してください。
        </div>
      )}
    </div>
  )
}
