import { useState, useEffect } from 'react'
import { Shield, Fingerprint, KeyRound, AlertCircle } from 'lucide-react'
import { useAuthStore } from '../store/authStore'

const isMac = navigator.userAgent.includes('Mac OS X')

export default function LockScreen(): JSX.Element {
  const { method, canUseBiometric, unlock } = useAuthStore()
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [biometricLoading, setBiometricLoading] = useState(false)

  useEffect(() => {
    if (method === 'biometric') {
      handleBiometric()
    }
  }, [method])

  async function handleBiometric(): Promise<void> {
    setBiometricLoading(true)
    setError('')
    try {
      const ok = await window.api.auth.promptBiometric()
      if (ok) {
        unlock()
      } else {
        setError('認証に失敗しました。もう一度お試しください。')
      }
    } catch {
      setError('認証エラーが発生しました。')
    } finally {
      setBiometricLoading(false)
    }
  }

  function handlePinKey(digit: string): void {
    if (pin.length >= 6) return
    const next = pin + digit
    setPin(next)
    setError('')
    if (next.length === 6) {
      verifyPinNow(next)
    }
  }

  async function verifyPinNow(p: string): Promise<void> {
    const ok = await window.api.auth.verifyPin(p)
    if (ok) {
      unlock()
    } else {
      setError('PINが正しくありません。')
      setPin('')
    }
  }

  function handlePinDelete(): void {
    setPin((p) => p.slice(0, -1))
    setError('')
  }

  const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫']

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex flex-col items-center justify-center select-none">
      {/* macOS traffic light spacer */}
      <div className="absolute top-0 left-0 right-0 h-10" style={{ WebkitAppRegion: 'drag' } as React.CSSProperties} />

      <div className="flex flex-col items-center gap-8 w-full max-w-xs px-6">
        {/* Icon */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center backdrop-blur">
            <Shield size={32} className="text-blue-400" />
          </div>
          <div className="text-center">
            <h1 className="text-white font-bold text-xl">CourtStrategies</h1>
            <p className="text-slate-400 text-sm mt-1">認証してください</p>
          </div>
        </div>

        {/* Biometric method */}
        {method === 'biometric' && (
          <div className="flex flex-col items-center gap-4 w-full">
            <button
              onClick={handleBiometric}
              disabled={biometricLoading}
              className="w-full flex items-center justify-center gap-3 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-wait text-white font-semibold transition-colors"
            >
              <Fingerprint size={20} />
              {biometricLoading
                ? '認証中...'
                : isMac
                  ? 'Touch IDで認証'
                  : 'Windows Helloで認証'}
            </button>

            {canUseBiometric && (
              <button
                onClick={() => useAuthStore.setState({ method: 'pin' })}
                className="text-slate-400 text-xs hover:text-slate-300 transition-colors"
              >
                PINで認証する
              </button>
            )}
          </div>
        )}

        {/* PIN method */}
        {(method === 'pin' || (method === 'biometric' && !canUseBiometric)) && (
          <div className="flex flex-col items-center gap-5 w-full">
            <div className="flex items-center gap-3">
              <KeyRound size={16} className="text-slate-400" />
              <p className="text-slate-300 text-sm">6桁のPINを入力</p>
            </div>

            {/* PIN dots */}
            <div className="flex gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className={`w-3 h-3 rounded-full border-2 transition-colors ${
                    i < pin.length
                      ? 'bg-blue-400 border-blue-400'
                      : 'border-slate-500 bg-transparent'
                  }`}
                />
              ))}
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 text-red-400 text-xs">
                <AlertCircle size={13} />
                {error}
              </div>
            )}

            {/* Keypad */}
            <div className="grid grid-cols-3 gap-3 w-full">
              {digits.map((d, i) => (
                <button
                  key={i}
                  onClick={() => {
                    if (d === '⌫') handlePinDelete()
                    else if (d !== '') handlePinKey(d)
                  }}
                  disabled={d === ''}
                  className={`h-14 rounded-xl text-lg font-semibold transition-colors ${
                    d === ''
                      ? 'cursor-default'
                      : d === '⌫'
                        ? 'bg-slate-700/60 hover:bg-slate-600/60 text-slate-300'
                        : 'bg-slate-700/60 hover:bg-slate-600/60 text-white'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>

            {method === 'biometric' && canUseBiometric && (
              <button
                onClick={() => useAuthStore.setState({ method: 'biometric' })}
                className="text-slate-400 text-xs hover:text-slate-300 transition-colors flex items-center gap-1.5"
              >
                <Fingerprint size={13} />
                Touch IDで認証する
              </button>
            )}
          </div>
        )}

        {/* Error for biometric */}
        {method === 'biometric' && error && (
          <div className="flex items-center gap-2 text-red-400 text-xs">
            <AlertCircle size={13} />
            {error}
          </div>
        )}
      </div>
    </div>
  )
}
