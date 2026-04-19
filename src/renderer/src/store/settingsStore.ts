import { create } from 'zustand'

interface SettingsStore {
  geminiApiKey: string
  geminiModel: string
  ocrLanguage: string
  isLoaded: boolean
  load: () => Promise<void>
  setGeminiApiKey: (key: string) => Promise<void>
  setGeminiModel: (model: string) => Promise<void>
  setOcrLanguage: (lang: string) => Promise<void>
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  geminiApiKey: '',
  geminiModel: 'gemini-1.5-flash',
  ocrLanguage: 'jpn',
  isLoaded: false,

  load: async () => {
    const all = (await window.api.settings.getAll()) as Record<string, string>
    set({
      geminiApiKey: all['gemini_api_key'] ?? '',
      geminiModel: all['gemini_model'] ?? 'gemini-1.5-flash',
      ocrLanguage: all['ocr_language'] ?? 'jpn',
      isLoaded: true
    })
  },

  setGeminiApiKey: async (key) => {
    await window.api.settings.set('gemini_api_key', key)
    set({ geminiApiKey: key })
  },

  setGeminiModel: async (model) => {
    await window.api.settings.set('gemini_model', model)
    set({ geminiModel: model })
  },

  setOcrLanguage: async (lang) => {
    await window.api.settings.set('ocr_language', lang)
    set({ ocrLanguage: lang })
  }
}))
