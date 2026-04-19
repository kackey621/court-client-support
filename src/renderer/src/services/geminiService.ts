const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models'

// 利用可能なモデル一覧
export const GEMINI_MODELS = [
  { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash（推奨・最新・高速）' },
  { value: 'gemini-2.0-flash-lite', label: 'Gemini 2.0 Flash Lite（軽量・最速）' },
  { value: 'gemini-1.5-flash-latest', label: 'Gemini 1.5 Flash Latest（安定版）' },
  { value: 'gemini-1.5-pro-latest', label: 'Gemini 1.5 Pro Latest（高精度）' }
]

export const DEFAULT_MODEL = 'gemini-2.0-flash'

export interface GeminiMessage {
  role: 'user' | 'model'
  parts: { text: string }[]
}

export async function generateContent(
  apiKey: string,
  model: string,
  prompt: string,
  history: GeminiMessage[] = []
): Promise<string> {
  if (!apiKey) throw new Error('Gemini APIキーが設定されていません。設定画面から登録してください。')

  // モデル名の正規化: 古い形式を新しい形式に変換
  const normalizedModel = normalizeModelName(model)

  const contents: GeminiMessage[] = [
    ...history,
    { role: 'user', parts: [{ text: prompt }] }
  ]

  const res = await fetch(`${GEMINI_BASE}/${normalizedModel}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents,
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 8192
      },
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
      ]
    })
  })

  if (!res.ok) {
    const errText = await res.text()
    let errMsg = `HTTP ${res.status}`
    try {
      const errJson = JSON.parse(errText)
      errMsg = errJson?.error?.message ?? errMsg
    } catch {}
    throw new Error(`Gemini API エラー: ${errMsg}`)
  }

  const data = await res.json()
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error('Gemini APIからの応答が空です')
  return text
}

/** 古いモデル名を現行の名称に変換 */
function normalizeModelName(model: string): string {
  const aliases: Record<string, string> = {
    'gemini-1.5-flash': 'gemini-1.5-flash-latest',
    'gemini-1.5-pro': 'gemini-1.5-pro-latest',
    'gemini-flash-latest': 'gemini-2.0-flash',
    'gemini-pro': 'gemini-1.5-pro-latest'
  }
  return aliases[model] ?? model
}

export async function summarizeDocument(
  apiKey: string,
  model: string,
  documentTitle: string,
  content: string,
  caseTitle: string
): Promise<string> {
  const prompt = `あなたは日本の法律案件を扱う専門家アシスタントです。
以下の文書を要約してください。案件のコンテキスト: ${caseTitle}

文書タイトル: ${documentTitle}

文書内容:
${content.slice(0, 15000)}

以下の形式で要約してください（日本語で回答）：
## 概要
（2〜3文で文書の概要）

## 重要ポイント
- （箇条書きで3〜5点）

## 法的に重要な点
- （箇条書きで関連する法的事項）

## 注目すべき事実
- （見落としやすいが重要な事実）`

  return generateContent(apiKey, model, prompt)
}

export async function askAboutDocument(
  apiKey: string,
  model: string,
  question: string,
  documentContent: string,
  documentTitle: string,
  history: GeminiMessage[]
): Promise<string> {
  const systemContext = `あなたは日本の法律案件を扱う専門家アシスタントです。
以下の文書についての質問に答えてください。ユーザーデータの学習には使用しません。

文書タイトル: ${documentTitle}

文書内容（参照用）:
${documentContent.slice(0, 12000)}

---`

  const fullPrompt = history.length === 0 ? `${systemContext}\n\n${question}` : question

  return generateContent(apiKey, model, fullPrompt, history.length > 0 ? history : [])
}
