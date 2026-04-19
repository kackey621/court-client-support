import { create } from 'zustand'
import type { Case } from '../types'

interface CaseStore {
  cases: Case[]
  activeCaseId: number
  activeCase: Case | null
  fetchCases: () => Promise<void>
  setActiveCase: (id: number) => void
  updateCase: (id: number, data: Partial<Pick<Case, 'title' | 'description' | 'color'>>) => Promise<void>
}

export const useCaseStore = create<CaseStore>((set, get) => ({
  cases: [],
  activeCaseId: 1,
  activeCase: null,

  fetchCases: async () => {
    const cases = (await window.api.cases.list()) as Case[]
    const activeCaseId = get().activeCaseId
    set({
      cases,
      activeCase: cases.find((c) => c.id === activeCaseId) ?? cases[0] ?? null
    })
  },

  setActiveCase: (id: number) => {
    const cases = get().cases
    set({ activeCaseId: id, activeCase: cases.find((c) => c.id === id) ?? null })
  },

  updateCase: async (id, data) => {
    await window.api.cases.update(id, data as Record<string, unknown>)
    set((s) => {
      const updated = s.cases.map((c) => (c.id === id ? { ...c, ...data } : c))
      const activeCaseId = s.activeCaseId
      return {
        cases: updated,
        activeCase: updated.find((c) => c.id === activeCaseId) ?? s.activeCase
      }
    })
  }
}))
