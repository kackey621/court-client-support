import { useState } from 'react'
import {
  FileDown, FileText, Copy, CheckCircle, AlertCircle,
  ChevronDown, ChevronUp, ScanText
} from 'lucide-react'
import type { Document, DocumentComment } from '../../types'
import { DOC_CATEGORIES } from '../../types'

interface Props {
  doc: Document
  caseTitle: string
  comments: DocumentComment[]
}

interface ExportOptions {
  includeWiki: boolean
  includeOcr: boolean
  includeSummary: boolean
  includeComments: boolean
}

/** MarkdownをプレーンテキストHTML変換（エクスポート用） */
function mdToHtml(md: string): string {
  return md
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
    .replace(/\*(.+?)\*/g, '<i>$1</i>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>')
}

/** Google Docs にそのままペーストできるクリップボードHTML生成 */
function buildClipboardHtml(doc: Document, caseTitle: string, comments: DocumentComment[], opts: ExportOptions): string {
  const catLabel = DOC_CATEGORIES[doc.doc_category as keyof typeof DOC_CATEGORIES]?.label ?? '参考文書'
  const date = new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })

  let html = `
<html><body style="font-family:Noto Sans JP,Yu Gothic,sans-serif;font-size:11pt;line-height:1.8;color:#1f2937;max-width:750px;margin:0 auto;padding:24px">

<h1 style="font-size:18pt;font-weight:700;color:#111827;border-bottom:2px solid #e5e7eb;padding-bottom:8px;margin-bottom:4px">
  ${doc.title}
</h1>
<p style="color:#6b7280;font-size:9pt;margin:0 0 24px">
  案件：${caseTitle}　／　分類：${catLabel}　／　${date}
</p>`

  if (opts.includeWiki && doc.wiki_content?.trim()) {
    html += `
<h2 style="font-size:14pt;font-weight:700;color:#1d4ed8;margin-top:24px;margin-bottom:8px">Wiki・論点整理</h2>
<div style="background:#f0f9ff;border-left:4px solid #3b82f6;padding:12px 16px;margin-bottom:16px">
${mdToHtml(doc.wiki_content)}
</div>`
  }

  if (opts.includeSummary && doc.summary_text?.trim()) {
    html += `
<h2 style="font-size:14pt;font-weight:700;color:#6d28d9;margin-top:24px;margin-bottom:8px">AI要約</h2>
<div style="background:#faf5ff;border-left:4px solid #8b5cf6;padding:12px 16px;margin-bottom:16px">
<p style="margin:0">${doc.summary_text.replace(/\n/g, '<br>')}</p>
</div>`
  }

  if (opts.includeOcr && doc.ocr_text?.trim()) {
    const preview = doc.ocr_text.slice(0, 3000)
    const truncated = doc.ocr_text.length > 3000
    html += `
<h2 style="font-size:14pt;font-weight:700;color:#0f766e;margin-top:24px;margin-bottom:8px">OCRテキスト</h2>
<div style="background:#f0fdf4;border-left:4px solid #10b981;padding:12px 16px;font-family:monospace;font-size:9pt;margin-bottom:16px">
${preview.replace(/\n/g, '<br>')}${truncated ? '<br><br><i>（以下省略）</i>' : ''}
</div>`
  }

  const unresolvedComments = comments.filter((c) => c.is_resolved === 0)
  if (opts.includeComments && unresolvedComments.length > 0) {
    html += `
<h2 style="font-size:14pt;font-weight:700;color:#1e40af;margin-top:24px;margin-bottom:8px">コメント（${unresolvedComments.length}件）</h2>`
    unresolvedComments.forEach((c, i) => {
      html += `
<div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:10px 14px;margin-bottom:8px">
  <p style="margin:0 0 4px;font-size:9pt;color:#1d4ed8;font-weight:600">
    #${i + 1}${c.page_ref ? `　${c.page_ref}` : ''}
  </p>
  <p style="margin:0">${c.content.replace(/\n/g, '<br>')}</p>
  <p style="margin:4px 0 0;font-size:8pt;color:#93c5fd">
    ${new Date(c.created_at).toLocaleDateString('ja-JP')}
  </p>
</div>`
    })
  }

  html += '</body></html>'
  return html
}

export default function ExportPanel({ doc, caseTitle, comments }: Props): JSX.Element {
  const [opts, setOpts] = useState<ExportOptions>({
    includeWiki: true,
    includeOcr: false,
    includeSummary: true,
    includeComments: true
  })
  const [exporting, setExporting] = useState(false)
  const [copied, setCopied] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null)
  const [showOpts, setShowOpts] = useState(false)

  function toggle(key: keyof ExportOptions): void {
    setOpts((o) => ({ ...o, [key]: !o[key] }))
  }

  /** Word (.docx) 出力 */
  async function exportWord(): Promise<void> {
    setExporting(true)
    setResult(null)
    try {
      const { Document, Packer, Paragraph, TextRun, HeadingLevel } = await import('docx')

      const children: InstanceType<typeof Paragraph>[] = []

      // タイトル
      children.push(
        new Paragraph({
          children: [new TextRun({ text: doc.title, bold: true, size: 36, color: '111827' })],
          heading: HeadingLevel.TITLE,
          spacing: { after: 200 }
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: `案件：${caseTitle}　分類：${DOC_CATEGORIES[doc.doc_category as keyof typeof DOC_CATEGORIES]?.label ?? '参考文書'}　${new Date().toLocaleDateString('ja-JP')}`,
              size: 18,
              color: '6b7280'
            })
          ],
          spacing: { after: 400 }
        })
      )

      if (opts.includeWiki && doc.wiki_content?.trim()) {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: 'Wiki・論点整理', bold: true, size: 28, color: '1d4ed8' })],
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 }
          })
        )
        doc.wiki_content.split('\n').forEach((line) => {
          children.push(new Paragraph({
            children: [new TextRun({ text: line, size: 22 })],
            spacing: { after: 80 }
          }))
        })
      }

      if (opts.includeSummary && doc.summary_text?.trim()) {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: 'AI要約', bold: true, size: 28, color: '6d28d9' })],
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 }
          })
        )
        doc.summary_text.split('\n').forEach((line) => {
          children.push(new Paragraph({
            children: [new TextRun({ text: line, size: 22 })],
            spacing: { after: 80 }
          }))
        })
      }

      if (opts.includeOcr && doc.ocr_text?.trim()) {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: 'OCRテキスト', bold: true, size: 28, color: '0f766e' })],
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 }
          })
        )
        doc.ocr_text.split('\n').forEach((line) => {
          children.push(new Paragraph({
            children: [new TextRun({ text: line, size: 20, font: 'Courier New' })],
            spacing: { after: 40 }
          }))
        })
      }

      const unresolvedComments = comments.filter((c) => c.is_resolved === 0)
      if (opts.includeComments && unresolvedComments.length > 0) {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: `コメント（${unresolvedComments.length}件）`, bold: true, size: 28, color: '1e40af' })],
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 }
          })
        )
        unresolvedComments.forEach((c, i) => {
          children.push(
            new Paragraph({
              children: [
                new TextRun({ text: `#${i + 1}${c.page_ref ? ` [${c.page_ref}]` : ''}  `, bold: true, size: 20, color: '1d4ed8' }),
                new TextRun({ text: new Date(c.created_at).toLocaleDateString('ja-JP'), size: 18, color: '93c5fd' })
              ],
              spacing: { before: 160, after: 80 }
            }),
            new Paragraph({
              children: [new TextRun({ text: c.content, size: 22 })],
              spacing: { after: 160 }
            })
          )
        })
      }

      const wordDoc = new Document({
        creator: 'CourtStrategies',
        title: doc.title,
        sections: [{ children }]
      })

      const blob = await Packer.toBlob(wordDoc)
      const buffer = await blob.arrayBuffer()
      const safeName = doc.title.replace(/[\\/:*?"<>|]/g, '_').slice(0, 60)
      const saved = await window.api.fs.saveFile(buffer, `${safeName}.docx`, [
        { name: 'Word文書', extensions: ['docx'] }
      ])
      if (saved) {
        setResult({ ok: true, msg: `保存しました: ${saved.split('/').pop()}` })
      } else {
        setResult({ ok: false, msg: 'キャンセルされました' })
      }
    } catch (e) {
      setResult({ ok: false, msg: `エラー: ${(e as Error).message}` })
    } finally {
      setExporting(false)
    }
  }

  /** Google Docs / クリップボードへHTML出力 */
  async function copyAsHtml(): Promise<void> {
    const html = buildClipboardHtml(doc, caseTitle, comments, opts)
    try {
      await navigator.clipboard.write([
        new ClipboardItem({ 'text/html': new Blob([html], { type: 'text/html' }) })
      ])
      setCopied(true)
      setTimeout(() => setCopied(false), 3000)
    } catch {
      // フォールバック: テキストとして
      const text = `${doc.title}\n\n${doc.wiki_content ?? ''}\n\n${doc.summary_text ?? ''}`
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 3000)
    }
  }

  return (
    <div className="space-y-4">
      {/* オプション */}
      <div>
        <button
          onClick={() => setShowOpts(!showOpts)}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors"
        >
          {showOpts ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          出力内容を選択
        </button>
        {showOpts && (
          <div className="mt-2 space-y-1.5 pl-2">
            {[
              { key: 'includeWiki' as const, label: 'Wiki・論点整理', disabled: !doc.wiki_content },
              { key: 'includeSummary' as const, label: 'AI要約', disabled: !doc.summary_text },
              { key: 'includeOcr' as const, label: 'OCRテキスト（全文）', disabled: !doc.ocr_text },
              { key: 'includeComments' as const, label: `コメント（${comments.filter((c) => c.is_resolved === 0).length}件）`, disabled: comments.filter((c) => c.is_resolved === 0).length === 0 }
            ].map(({ key, label, disabled }) => (
              <label
                key={key}
                className={`flex items-center gap-2 text-xs cursor-pointer ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={opts[key]}
                  onChange={() => !disabled && toggle(key)}
                  disabled={disabled}
                  className="rounded border-gray-300 text-blue-600"
                />
                {label}
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Word 出力 */}
      <div className="border border-gray-200 rounded-xl p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
            <FileDown size={18} className="text-blue-600" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-800">Word 形式で出力</p>
            <p className="text-xs text-gray-400 mt-0.5">
              .docx 形式で保存。Google Drive にアップロードすると Google Docs でも開けます。
            </p>
          </div>
        </div>
        <button
          onClick={exportWord}
          disabled={exporting}
          className="w-full btn-primary text-xs flex items-center justify-center gap-2"
        >
          <FileDown size={13} />
          {exporting ? 'Word を生成中...' : 'Word (.docx) を保存'}
        </button>
      </div>

      {/* Google Docs / HTML クリップボード */}
      <div className="border border-gray-200 rounded-xl p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 bg-green-50 rounded-lg flex items-center justify-center flex-shrink-0">
            <Copy size={18} className="text-green-600" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-800">Google Docs 用にコピー</p>
            <p className="text-xs text-gray-400 mt-0.5">
              書式付き HTML をクリップボードにコピー。Google Docs や Word に貼り付けると書式が保たれます。
            </p>
          </div>
        </div>
        <button
          onClick={copyAsHtml}
          className={`w-full text-xs flex items-center justify-center gap-2 transition-all py-2 px-4 rounded-lg font-medium ${
            copied
              ? 'bg-green-100 text-green-700 border border-green-200'
              : 'btn-secondary'
          }`}
        >
          {copied ? (
            <>
              <CheckCircle size={13} />
              コピーしました — 今すぐ貼り付け
            </>
          ) : (
            <>
              <Copy size={13} />
              書式付きでクリップボードにコピー
            </>
          )}
        </button>
      </div>

      {/* OCR テキスト単体出力 */}
      {doc.ocr_text && (
        <div className="border border-gray-200 rounded-xl p-4 space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 bg-emerald-50 rounded-lg flex items-center justify-center flex-shrink-0">
              <ScanText size={18} className="text-emerald-600" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-800">OCRテキストを .txt に保存</p>
              <p className="text-xs text-gray-400 mt-0.5">
                NDLOCR-Lite で抽出した本文のみを、整形なしでテキストファイルに出力します。
              </p>
            </div>
          </div>
          <button
            onClick={async () => {
              if (!doc.ocr_text) return
              const buffer = new TextEncoder().encode(doc.ocr_text).buffer
              const safeName = doc.title.replace(/[\\/:*?"<>|]/g, '_').slice(0, 60)
              const saved = await window.api.fs.saveFile(buffer, `${safeName}_OCR.txt`, [
                { name: 'テキストファイル', extensions: ['txt'] }
              ])
              setResult(
                saved
                  ? { ok: true, msg: `保存しました: ${saved.split('/').pop()}` }
                  : { ok: false, msg: 'キャンセルされました' }
              )
            }}
            className="w-full btn-secondary text-xs flex items-center justify-center gap-2"
          >
            <ScanText size={13} />
            OCRテキスト (.txt) を保存
          </button>
        </div>
      )}

      {/* テキスト出力（複合） */}
      <div className="border border-gray-200 rounded-xl p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 bg-gray-50 rounded-lg flex items-center justify-center flex-shrink-0">
            <FileText size={18} className="text-gray-500" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-800">テキスト形式で出力</p>
            <p className="text-xs text-gray-400 mt-0.5">Wiki / AI要約 / OCR をまとめて .txt に保存します。</p>
          </div>
        </div>
        <button
          onClick={async () => {
            const lines: string[] = [`${doc.title}`, `${'='.repeat(doc.title.length)}`, '', `案件: ${caseTitle}`, `分類: ${DOC_CATEGORIES[doc.doc_category as keyof typeof DOC_CATEGORIES]?.label ?? '参考文書'}`, '']
            if (opts.includeWiki && doc.wiki_content?.trim()) {
              lines.push('## Wiki・論点整理', '', doc.wiki_content, '')
            }
            if (opts.includeSummary && doc.summary_text?.trim()) {
              lines.push('## AI要約', '', doc.summary_text, '')
            }
            if (opts.includeOcr && doc.ocr_text?.trim()) {
              lines.push('## OCRテキスト', '', doc.ocr_text, '')
            }
            const text = lines.join('\n')
            const buffer = new TextEncoder().encode(text).buffer
            const safeName = doc.title.replace(/[\\/:*?"<>|]/g, '_').slice(0, 60)
            await window.api.fs.saveFile(buffer, `${safeName}.txt`, [
              { name: 'テキストファイル', extensions: ['txt'] }
            ])
          }}
          className="w-full btn-secondary text-xs flex items-center justify-center gap-2"
        >
          <FileText size={13} />
          テキスト (.txt) を保存
        </button>
      </div>

      {/* 結果メッセージ */}
      {result && (
        <div
          className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg ${
            result.ok
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-600 border border-red-200'
          }`}
        >
          {result.ok ? <CheckCircle size={13} /> : <AlertCircle size={13} />}
          {result.msg}
        </div>
      )}
    </div>
  )
}
