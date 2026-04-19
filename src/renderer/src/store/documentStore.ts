import { create } from 'zustand'
import type { Document, DocumentFilter } from '../types'

interface DocumentStore {
  documents: Document[]
  filter: DocumentFilter
  isLoading: boolean
  fetchDocuments: (caseId: number, filter?: DocumentFilter) => Promise<void>
  importFiles: (caseId: number, filePaths: string[]) => Promise<Document[]>
  importZip: (caseId: number, zipPath: string) => Promise<Document[]>
  importFolder: (caseId: number, folderPath: string) => Promise<Document[]>
  deleteDocument: (id: number) => Promise<void>
  updateDocument: (id: number, data: Partial<Document>) => Promise<void>
  saveOcr: (id: number, ocrText: string) => Promise<Document>
  saveSummary: (id: number, summaryText: string) => Promise<Document>
  setBookmark: (id: number, bookmarked: boolean) => Promise<void>
  setFilter: (filter: DocumentFilter) => void
}

export const useDocumentStore = create<DocumentStore>((set, get) => ({
  documents: [],
  filter: {},
  isLoading: false,

  fetchDocuments: async (caseId, filter) => {
    set({ isLoading: true })
    try {
      const docs = (await window.api.documents.list(
        caseId,
        filter ?? get().filter
      )) as Document[]
      set({ documents: docs })
    } finally {
      set({ isLoading: false })
    }
  },

  importFiles: async (caseId, filePaths) => {
    const docs = (await window.api.documents.import(caseId, filePaths)) as Document[]
    set((s) => ({ documents: [...docs, ...s.documents] }))
    return docs
  },

  importZip: async (caseId, zipPath) => {
    const docs = (await window.api.documents.importZip(caseId, zipPath)) as Document[]
    set((s) => ({ documents: [...docs, ...s.documents] }))
    return docs
  },

  importFolder: async (caseId, folderPath) => {
    const docs = (await window.api.documents.importFolder(caseId, folderPath)) as Document[]
    set((s) => ({ documents: [...docs, ...s.documents] }))
    return docs
  },

  deleteDocument: async (id) => {
    await window.api.documents.delete(id)
    set((s) => ({ documents: s.documents.filter((d) => d.id !== id) }))
  },

  updateDocument: async (id, data) => {
    const updated = (await window.api.documents.update(
      id,
      data as Record<string, unknown>
    )) as Document
    set((s) => ({ documents: s.documents.map((d) => (d.id === id ? updated : d)) }))
  },

  saveOcr: async (id, ocrText) => {
    const updated = (await window.api.documents.saveOcr(id, ocrText)) as Document
    set((s) => ({ documents: s.documents.map((d) => (d.id === id ? updated : d)) }))
    return updated
  },

  saveSummary: async (id, summaryText) => {
    const updated = (await window.api.documents.saveSummary(id, summaryText)) as Document
    set((s) => ({ documents: s.documents.map((d) => (d.id === id ? updated : d)) }))
    return updated
  },

  setBookmark: async (id, bookmarked) => {
    await window.api.documents.setBookmark(id, bookmarked)
    set((s) => ({
      documents: s.documents.map((d) =>
        d.id === id ? { ...d, is_bookmarked: bookmarked ? 1 : 0 } : d
      )
    }))
  },

  setFilter: (filter) => set({ filter })
}))
