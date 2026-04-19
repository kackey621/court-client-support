const EGOV_BASE = 'https://laws.e-gov.go.jp/api/2'

export interface LawListItem {
  law_id: string
  law_type: string
  law_num: string
  law_name: string
  promulgation_date: string
}

export interface LawData {
  law_id: string
  law_name: string
  law_num: string
  xml_content: string
}

export async function searchLaws(keyword: string): Promise<LawListItem[]> {
  const url = `${EGOV_BASE}/laws?keyword=${encodeURIComponent(keyword)}&category=1`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`e-gov API エラー: ${res.status}`)
  const data = await res.json()
  return (data?.laws ?? []) as LawListItem[]
}

export async function getLawContent(lawId: string): Promise<string> {
  const url = `${EGOV_BASE}/law_data/${lawId}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`e-gov API エラー: ${res.status}`)
  const text = await res.text()
  return xmlToText(text)
}

function xmlToText(xml: string): string {
  const parser = new DOMParser()
  const doc = parser.parseFromString(xml, 'text/xml')

  function extractText(node: Element, indent = 0): string {
    let result = ''
    const tag = node.tagName

    if (tag === 'ArticleTitle' || tag === 'ParagraphNum') {
      result += '  '.repeat(indent) + node.textContent?.trim() + '\n'
    } else if (tag === 'Sentence') {
      result += '  '.repeat(indent) + node.textContent?.trim() + '\n'
    } else if (tag === 'Article') {
      result += '\n'
      for (const child of Array.from(node.children)) {
        result += extractText(child as Element, indent)
      }
    } else {
      for (const child of Array.from(node.children)) {
        result += extractText(child as Element, indent)
      }
    }

    return result
  }

  const body = doc.querySelector('LawBody')
  if (!body) return doc.documentElement?.textContent ?? ''
  return extractText(body)
}

export async function searchPrecedents(keyword: string): Promise<{ title: string; url: string }[]> {
  return [
    {
      title: `裁判所判例検索: "${keyword}"`,
      url: `https://www.courts.go.jp/app/hanrei_jp/search1?${new URLSearchParams({ hanreiNo: '', hanreiKbn: '', tokushu: '', jikenMei: keyword })}`
    },
    {
      title: `D1-Law.com 判例検索: "${keyword}"`,
      url: `https://www.d1-law.com/hanrei/search?search_word=${encodeURIComponent(keyword)}`
    },
    {
      title: `最高裁判所 判例検索: "${keyword}"`,
      url: `https://www.courts.go.jp/app/hanrei_jp/search1`
    }
  ]
}
