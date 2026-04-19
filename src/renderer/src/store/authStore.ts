import { create } from 'zustand'

export type AuthMethod = 'biometric' | 'pin' | 'none'
export type AuthStatus = 'loading' | 'setup' | 'locked' | 'unlocked'

interface AuthState {
  status: AuthStatus
  method: AuthMethod
  canUseBiometric: boolean
  autoLockMinutes: number
  load: () => Promise<void>
  unlock: () => void
  lock: () => void
  setMethod: (m: AuthMethod) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  status: 'loading',
  method: 'none',
  canUseBiometric: false,
  autoLockMinutes: 5,

  load: async () => {
    const [state, canBio] = await Promise.all([
      window.api.auth.getState(),
      window.api.auth.canUseBiometric()
    ])
    if (state.isFirstRun) {
      set({ status: 'setup', method: state.method, canUseBiometric: canBio })
    } else if (state.method === 'none') {
      set({ status: 'unlocked', method: state.method, canUseBiometric: canBio })
    } else {
      set({ status: 'locked', method: state.method, canUseBiometric: canBio })
    }
  },

  unlock: () => set({ status: 'unlocked' }),
  lock: () => set({ status: 'locked' }),
  setMethod: (m) => set({ method: m })
}))
