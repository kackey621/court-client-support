import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const api = {
  cases: {
    list: () => ipcRenderer.invoke('cases:list'),
    get: (id: number) => ipcRenderer.invoke('cases:get', id),
    update: (id: number, data: Record<string, unknown>) =>
      ipcRenderer.invoke('cases:update', { id, data })
  },

  documents: {
    list: (caseId: number, filter?: Record<string, unknown>) =>
      ipcRenderer.invoke('documents:list', { caseId, filter }),
    get: (id: number) => ipcRenderer.invoke('documents:get', id),
    import: (caseId: number, filePaths: string[]) =>
      ipcRenderer.invoke('documents:import', { caseId, filePaths }),
    importZip: (caseId: number, zipPath: string) =>
      ipcRenderer.invoke('documents:import-zip', { caseId, zipPath }),
    importFolder: (caseId: number, folderPath: string) =>
      ipcRenderer.invoke('documents:import-folder', { caseId, folderPath }),
    delete: (id: number) => ipcRenderer.invoke('documents:delete', id),
    update: (id: number, data: Record<string, unknown>) =>
      ipcRenderer.invoke('documents:update', { id, data }),
    saveOcr: (id: number, ocrText: string) =>
      ipcRenderer.invoke('documents:save-ocr', { id, ocrText }),
    saveSummary: (id: number, summaryText: string) =>
      ipcRenderer.invoke('documents:save-summary', { id, summaryText }),
    setBookmark: (id: number, bookmarked: boolean, comment?: string) =>
      ipcRenderer.invoke('documents:set-bookmark', { id, bookmarked, comment }),
    setCategory: (id: number, category: string, locked?: boolean) =>
      ipcRenderer.invoke('documents:set-category', { id, category, locked }),
    setWiki: (id: number, content: string) =>
      ipcRenderer.invoke('documents:set-wiki', { id, content })
  },

  fs: {
    readFile: (filePath: string): Promise<{ data: ArrayBuffer; mimeType: string }> =>
      ipcRenderer.invoke('fs:read-file', filePath),
    openDialog: (
      filters: Electron.FileFilter[],
      properties: string[]
    ): Promise<string[]> => ipcRenderer.invoke('fs:open-dialog', { filters, properties }),
    folderDialog: (): Promise<string | null> => ipcRenderer.invoke('fs:folder-dialog'),
    fileExists: (filePath: string): Promise<boolean> =>
      ipcRenderer.invoke('fs:file-exists', filePath),
    showInFinder: (filePath: string) => ipcRenderer.invoke('fs:show-in-finder', filePath),
    saveFile: (buffer: ArrayBuffer, defaultName: string, filters?: { name: string; extensions: string[] }[]) =>
      ipcRenderer.invoke('fs:save-file', { buffer, defaultName, filters })
  },

  notes: {
    list: (caseId: number, documentId?: number) =>
      ipcRenderer.invoke('notes:list', { caseId, documentId }),
    get: (id: number) => ipcRenderer.invoke('notes:get', id),
    create: (payload: {
      caseId: number
      documentId?: number
      title: string
      body: string
      tags: string[]
    }) => ipcRenderer.invoke('notes:create', payload),
    update: (id: number, data: Record<string, unknown>) =>
      ipcRenderer.invoke('notes:update', { id, data }),
    delete: (id: number) => ipcRenderer.invoke('notes:delete', id)
  },

  bookmarks: {
    list: (caseId: number) => ipcRenderer.invoke('bookmarks:list', { caseId }),
    reorder: (ids: number[]) => ipcRenderer.invoke('bookmarks:reorder', { ids })
  },

  search: {
    ftsQuery: (query: string, caseId?: number, limit?: number) =>
      ipcRenderer.invoke('search:fts-query', { query, caseId, limit }),
    log: (query: string, resultCount: number, caseId?: number) =>
      ipcRenderer.invoke('search:log', { query, resultCount, caseId }),
    recommendations: (caseId?: number, limit?: number) =>
      ipcRenderer.invoke('search:recommendations', { caseId, limit }),
    history: (caseId?: number, limit?: number) =>
      ipcRenderer.invoke('search:history', { caseId, limit })
  },

  settings: {
    get: <T = unknown>(key: string): Promise<T> => ipcRenderer.invoke('settings:get', key),
    set: (key: string, value: unknown) => ipcRenderer.invoke('settings:set', { key, value }),
    getAll: () => ipcRenderer.invoke('settings:get-all')
  },

  shell: {
    copyText: (text: string) => ipcRenderer.invoke('shell:copy-text', text),
    openExternal: (url: string) => ipcRenderer.invoke('shell:open-external', url),
    print: (html: string, title?: string) =>
      ipcRenderer.invoke('shell:print', { html, title })
  },

  ai: {
    saveMessage: (
      caseId: number,
      documentId: number | null,
      role: string,
      content: string
    ) => ipcRenderer.invoke('ai:save-message', { caseId, documentId, role, content }),
    getHistory: (caseId: number, documentId?: number) =>
      ipcRenderer.invoke('ai:get-history', { caseId, documentId }),
    clearHistory: (caseId: number, documentId?: number) =>
      ipcRenderer.invoke('ai:clear-history', { caseId, documentId })
  },

  sections: {
    list: (caseId: number) => ipcRenderer.invoke('sections:list', { caseId }),
    create: (caseId: number, name: string, parentId?: number, icon?: string) =>
      ipcRenderer.invoke('sections:create', { caseId, name, parentId, icon }),
    update: (id: number, name: string, icon?: string) =>
      ipcRenderer.invoke('sections:update', { id, name, icon }),
    delete: (id: number) => ipcRenderer.invoke('sections:delete', { id }),
    moveDocument: (documentId: number, sectionId: number | null) =>
      ipcRenderer.invoke('sections:move-document', { documentId, sectionId }),
    reorder: (orders: { id: number; sort_order: number }[]) =>
      ipcRenderer.invoke('sections:reorder', { orders })
  },

  pinned: {
    list: (caseId: number) => ipcRenderer.invoke('pinned:list', { caseId }),
    add: (caseId: number, documentId: number) =>
      ipcRenderer.invoke('pinned:add', { caseId, documentId }),
    remove: (caseId: number, documentId: number) =>
      ipcRenderer.invoke('pinned:remove', { caseId, documentId }),
    reorder: (orders: { id: number; sort_order: number }[]) =>
      ipcRenderer.invoke('pinned:reorder', { orders })
  },

  auth: {
    getState: (): Promise<{ method: string; isFirstRun: boolean; autoLockMinutes: number }> =>
      ipcRenderer.invoke('auth:get-state'),
    canUseBiometric: (): Promise<boolean> =>
      ipcRenderer.invoke('auth:can-use-biometric'),
    promptBiometric: (): Promise<boolean> =>
      ipcRenderer.invoke('auth:prompt-biometric'),
    verifyPin: (pin: string): Promise<boolean> =>
      ipcRenderer.invoke('auth:verify-pin', { pin }),
    setPin: (pin: string): Promise<void> =>
      ipcRenderer.invoke('auth:set-pin', { pin }),
    setMethod: (method: string): Promise<void> =>
      ipcRenderer.invoke('auth:set-method', { method }),
    completeSetup: (): Promise<void> =>
      ipcRenderer.invoke('auth:complete-setup'),
    setAutoLock: (minutes: number): Promise<void> =>
      ipcRenderer.invoke('auth:set-auto-lock', { minutes })
  },

  comments: {
    list: (documentId: number) =>
      ipcRenderer.invoke('comments:list', { documentId }),
    create: (documentId: number, caseId: number, content: string, pageRef?: string) =>
      ipcRenderer.invoke('comments:create', { documentId, caseId, content, pageRef }),
    update: (id: number, content: string) =>
      ipcRenderer.invoke('comments:update', { id, content }),
    delete: (id: number) =>
      ipcRenderer.invoke('comments:delete', { id }),
    resolve: (id: number, resolved: boolean) =>
      ipcRenderer.invoke('comments:resolve', { id, resolved })
  },

  activity: {
    listDocument: (documentId: number, limit?: number) =>
      ipcRenderer.invoke('activity:list-document', { documentId, limit }),
    listCase: (caseId: number, limit?: number) =>
      ipcRenderer.invoke('activity:list-case', { caseId, limit })
  },

  ocr: {
    isAvailable: (): Promise<boolean> => ipcRenderer.invoke('ocr:is-available'),
    enqueue: (id: number): Promise<{ ok: boolean }> =>
      ipcRenderer.invoke('ocr:enqueue', { id }),
    enqueueMany: (ids: number[]): Promise<{ ok: boolean; queued: number }> =>
      ipcRenderer.invoke('ocr:enqueue-many', { ids }),
    processQueue: (): Promise<{ ok: boolean }> => ipcRenderer.invoke('ocr:process-queue'),
    status: (id: number) => ipcRenderer.invoke('ocr:status', { id }),
    queueSummary: (caseId?: number) => ipcRenderer.invoke('ocr:queue-summary', { caseId }),
    onProgress: (
      cb: (payload: { docId: number; progress: number; message: string; status: string }) => void
    ): (() => void) => {
      const listener = (_: unknown, payload: unknown): void => cb(payload as never)
      ipcRenderer.on('ocr:progress', listener)
      return () => ipcRenderer.removeListener('ocr:progress', listener)
    },
    onStatus: (
      cb: (payload: {
        docId: number
        status: 'running' | 'done' | 'error'
        progress?: number
        textLength?: number
        pages?: number
        error?: string
      }) => void
    ): (() => void) => {
      const listener = (_: unknown, payload: unknown): void => cb(payload as never)
      ipcRenderer.on('ocr:status', listener)
      return () => ipcRenderer.removeListener('ocr:status', listener)
    }
  }
}

if (process.contextIsolated) {
  contextBridge.exposeInMainWorld('electron', electronAPI)
  contextBridge.exposeInMainWorld('api', api)
} else {
  // @ts-ignore
  window.electron = electronAPI
  // @ts-ignore
  window.api = api
}
