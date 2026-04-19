/// <reference types="vite/client" />

interface Window {
  api: {
    cases: {
      list: () => Promise<import('./types').Case[]>
      get: (id: number) => Promise<import('./types').Case>
      update: (id: number, data: Record<string, unknown>) => Promise<import('./types').Case>
    }
    documents: {
      list: (caseId: number, filter?: Record<string, unknown>) => Promise<import('./types').Document[]>
      get: (id: number) => Promise<import('./types').Document>
      import: (caseId: number, filePaths: string[]) => Promise<import('./types').Document[]>
      importZip: (caseId: number, zipPath: string) => Promise<import('./types').Document[]>
      importFolder: (caseId: number, folderPath: string) => Promise<import('./types').Document[]>
      delete: (id: number) => Promise<void>
      update: (id: number, data: Record<string, unknown>) => Promise<import('./types').Document>
      saveOcr: (id: number, ocrText: string) => Promise<import('./types').Document>
      saveSummary: (id: number, summaryText: string) => Promise<import('./types').Document>
      setBookmark: (id: number, bookmarked: boolean, comment?: string) => Promise<void>
      setCategory: (id: number, category: string, locked?: boolean) => Promise<import('./types').Document>
      setWiki: (id: number, content: string) => Promise<import('./types').Document>
    }
    fs: {
      readFile: (filePath: string) => Promise<{ data: ArrayBuffer; mimeType: string }>
      openDialog: (filters: { name: string; extensions: string[] }[], properties: string[]) => Promise<string[]>
      folderDialog: () => Promise<string | null>
      fileExists: (filePath: string) => Promise<boolean>
      showInFinder: (filePath: string) => Promise<void>
      saveFile: (buffer: ArrayBuffer, defaultName: string, filters?: { name: string; extensions: string[] }[]) => Promise<string | null>
    }
    notes: {
      list: (caseId: number, documentId?: number) => Promise<import('./types').Note[]>
      get: (id: number) => Promise<import('./types').Note>
      create: (payload: { caseId: number; documentId?: number; title: string; body: string; tags: string[] }) => Promise<import('./types').Note>
      update: (id: number, data: Record<string, unknown>) => Promise<import('./types').Note>
      delete: (id: number) => Promise<void>
    }
    bookmarks: {
      list: (caseId: number) => Promise<import('./types').Bookmark[]>
      reorder: (ids: number[]) => Promise<void>
    }
    search: {
      ftsQuery: (query: string, caseId?: number, limit?: number) => Promise<import('./types').SearchResult[]>
      log: (query: string, resultCount: number, caseId?: number) => Promise<void>
      recommendations: (caseId?: number, limit?: number) => Promise<string[]>
      history: (caseId?: number, limit?: number) => Promise<import('./types').SearchHistoryRow[]>
    }
    settings: {
      get: <T = unknown>(key: string) => Promise<T>
      set: (key: string, value: unknown) => Promise<void>
      getAll: () => Promise<Record<string, unknown>>
    }
    shell: {
      copyText: (text: string) => Promise<void>
      openExternal: (url: string) => Promise<void>
      print: (html: string, title?: string) => Promise<void>
    }
    ai: {
      saveMessage: (caseId: number, documentId: number | null, role: string, content: string) => Promise<import('./types').AIMessage>
      getHistory: (caseId: number, documentId?: number) => Promise<import('./types').AIMessage[]>
      clearHistory: (caseId: number, documentId?: number) => Promise<void>
    }
    sections: {
      list: (caseId: number) => Promise<import('./types').Section[]>
      create: (caseId: number, name: string, parentId?: number, icon?: string) => Promise<import('./types').Section>
      update: (id: number, name: string, icon?: string) => Promise<import('./types').Section>
      delete: (id: number) => Promise<void>
      moveDocument: (documentId: number, sectionId: number | null) => Promise<void>
      reorder: (orders: { id: number; sort_order: number }[]) => Promise<void>
    }
    pinned: {
      list: (caseId: number) => Promise<import('./types').PinnedNavItem[]>
      add: (caseId: number, documentId: number) => Promise<void>
      remove: (caseId: number, documentId: number) => Promise<void>
      reorder: (orders: { id: number; sort_order: number }[]) => Promise<void>
    }
    comments: {
      list: (documentId: number) => Promise<import('./types').DocumentComment[]>
      create: (documentId: number, caseId: number, content: string, pageRef?: string) => Promise<import('./types').DocumentComment>
      update: (id: number, content: string) => Promise<import('./types').DocumentComment>
      delete: (id: number) => Promise<void>
      resolve: (id: number, resolved: boolean) => Promise<import('./types').DocumentComment>
    }
    activity: {
      listDocument: (documentId: number, limit?: number) => Promise<import('./types').DocumentActivity[]>
      listCase: (caseId: number, limit?: number) => Promise<import('./types').DocumentActivity[]>
    }
    auth: {
      getState: () => Promise<{ method: string; isFirstRun: boolean; autoLockMinutes: number }>
      canUseBiometric: () => Promise<boolean>
      promptBiometric: () => Promise<boolean>
      verifyPin: (pin: string) => Promise<boolean>
      setPin: (pin: string) => Promise<void>
      setMethod: (method: string) => Promise<void>
      completeSetup: () => Promise<void>
      setAutoLock: (minutes: number) => Promise<void>
    }
    ocr: {
      isAvailable: () => Promise<boolean>
      enqueue: (id: number) => Promise<{ ok: boolean }>
      enqueueMany: (ids: number[]) => Promise<{ ok: boolean; queued: number }>
      processQueue: () => Promise<{ ok: boolean }>
      status: (id: number) => Promise<{
        id: number
        ocr_status: 'pending' | 'running' | 'done' | 'error'
        ocr_error: string | null
        text_length: number
      }>
      queueSummary: (caseId?: number) => Promise<{ ocr_status: string; count: number }[]>
      onProgress: (
        cb: (payload: { docId: number; progress: number; message: string; status: string }) => void
      ) => () => void
      onStatus: (
        cb: (payload: {
          docId: number
          status: 'running' | 'done' | 'error'
          progress?: number
          textLength?: number
          pages?: number
          error?: string
        }) => void
      ) => () => void
    }
  }
}
