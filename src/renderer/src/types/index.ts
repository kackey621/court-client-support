export interface Case {
  id: number
  slug: string
  title: string
  description: string | null
  color: string
  created_at: string
  updated_at: string
}

export interface Document {
  id: number
  case_id: number
  title: string
  file_path: string
  file_name: string
  file_type: 'pdf' | 'image' | 'docx' | 'text' | 'other'
  mime_type: string | null
  file_size: number
  ocr_text: string | null
  ocr_status: 'pending' | 'running' | 'done' | 'error'
  ocr_error: string | null
  summary_text: string | null
  summary_at: string | null
  tags: string
  is_bookmarked: number
  section_id: number | null
  parent_doc_id: number | null
  /** evidence（証拠） | working（作業文書） | reference（参考） */
  doc_category: 'evidence' | 'working' | 'reference'
  /** 1 = 削除・上書き不可 */
  is_locked: number
  imported_at: string
  updated_at: string
  wiki_content: string | null
  snippet?: string
}

export interface Section {
  id: number
  case_id: number
  parent_id: number | null
  name: string
  icon: string
  sort_order: number
  created_at: string
  updated_at: string
  /** フロントエンドで計算するカウント */
  doc_count?: number
}

export interface PinnedNavItem {
  id: number
  case_id: number
  document_id: number
  title: string
  file_type: string
  file_path: string
  doc_category: 'evidence' | 'working' | 'reference'
  is_locked: number
  sort_order: number
  created_at: string
}

export interface Note {
  id: number
  case_id: number
  document_id: number | null
  title: string
  body: string
  tags: string
  is_pinned: number
  created_at: string
  updated_at: string
}

export interface Bookmark {
  id: number
  case_id: number
  document_id: number
  doc_title: string
  file_type: string
  file_path: string
  comment: string | null
  sort_order: number
  created_at: string
}

export interface SearchResult extends Document {
  snippet: string
}

export interface SearchHistoryRow {
  id: number
  case_id: number | null
  query: string
  result_count: number | null
  searched_at: string
}

export interface AIMessage {
  id: number
  case_id: number
  document_id: number | null
  role: 'user' | 'model'
  content: string
  created_at: string
}

export interface Settings {
  gemini_api_key: string
  gemini_model: string
  ocr_language: string
  app_theme: string
}

export interface LawResult {
  law_id: string
  law_name: string
  law_no: string
  promulgation_date: string
  category: string
}

export type DocumentFilter = {
  fileType?: string
  isBookmarked?: boolean
  ocrStatus?: string
  sectionId?: number | null
  docCategory?: string
}

export interface DocumentComment {
  id: number
  document_id: number
  case_id: number
  content: string
  page_ref: string | null
  is_resolved: number
  created_at: string
  updated_at: string
}

export interface DocumentActivity {
  id: number
  document_id: number
  case_id: number
  event_type: string
  description: string
  metadata: string | null
  created_at: string
  /** case-level query joins this */
  doc_title?: string
}

/** 文書カテゴリのラベル・スタイル定義 */
export const DOC_CATEGORIES = {
  evidence: { label: '証拠文書', color: 'bg-red-100 text-red-700', icon: '🔒' },
  working:  { label: '作業文書', color: 'bg-blue-100 text-blue-700', icon: '📝' },
  reference:{ label: '参考文書', color: 'bg-gray-100 text-gray-600', icon: '📎' }
} as const
