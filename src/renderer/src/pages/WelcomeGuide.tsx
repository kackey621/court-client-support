import { useState } from 'react'

const isMac = navigator.userAgent.includes('Mac OS X')
import {
  Shield, Fingerprint, KeyRound, Sparkles,
  ChevronRight, Check, FolderOpen, Scale, AlertCircle
} from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { useSettingsStore } from '../store'

type Step = 'welcome' | 'auth-choice' | 'pin-setup' | 'api-key' | 'overview' | 'done'

export default function WelcomeGuide(): JSX.Element {
  const { canUseBiometric, unlock, setMethod } = useAuthStore()
  const { geminiApiKey } = useSettingsStore()
  const [step, setStep] = useState<Step>('welcome')
  const [chosenMethod, setChosenMethod] = useState<'biometric' | 'pin' | 'none'>('none')
  const [pin, setPin] = useState('')
  const [pinConfirm, setPinConfirm] = useState('')
  const [pinPhase, setPinPhase] = useState<'enter' | 'confirm'>('enter')
  const [pinError, setPinError] = useState('')
  const [apiKey, setApiKey] = useState(geminiApiKey ?? '')
  const [apiSaving, setApiSaving] = useState(false)
  const [apiSaved, setApiSaved] = useState(false)
  const [finishing, setFinishing] = useState(false)

  // ── PIN entry ──
  function handlePinKey(digit: string): void {
    const target = pinPhase === 'enter' ? pin : pinConfirm
    if (target.length >= 6) return
    const next = target + digit
    if (pinPhase === 'enter') {
      setPin(next)
      if (next.length === 6) setPinPhase('confirm')
    } else {
      setPinConfirm(next)
      if (next.length === 6) {
        if (pin !== next) {
          setPinError('PINが一致しません。最初からやり直してください。')
          setPin('')
          setPinConfirm('')
          setPinPhase('enter')
        } else {
          setPinError('')
        }
      }
    }
  }

  function handlePinDelete(): void {
    if (pinPhase === 'enter') setPin((p) => p.slice(0, -1))
    else setPinConfirm((p) => p.slice(0, -1))
    setPinError('')
  }

  async function confirmPinSetup(): Promise<void> {
    if (pin.length !== 6 || pinConfirm !== pin) {
      setPinError('6桁のPINを正しく入力してください。')
      return
    }
    await window.api.auth.setPin(pin)
    await window.api.auth.setMethod('pin')
    setMethod('pin')
    setStep('api-key')
  }

  // ── Auth choice ──
  async function chooseMethod(m: 'biometric' | 'pin' | 'none'): Promise<void> {
    setChosenMethod(m)
    if (m === 'biometric') {
      await window.api.auth.setMethod('biometric')
      setMethod('biometric')
      setStep('api-key')
    } else if (m === 'pin') {
      setStep('pin-setup')
    } else {
      await window.api.auth.setMethod('none')
      setMethod('none')
      setStep('api-key')
    }
  }

  // ── API key ──
  async function saveApiKey(): Promise<void> {
    setApiSaving(true)
    await window.api.settings.set('gemini_api_key', apiKey)
    setApiSaving(false)
    setApiSaved(true)
  }

  // ── Finish ──
  async function finish(): Promise<void> {
    setFinishing(true)
    await window.api.auth.completeSetup()
    unlock()
  }

  const pinDigits = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫']
  const currentPin = pinPhase === 'enter' ? pin : pinConfirm

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex flex-col items-center justify-center select-none">
      {/* macOS drag area */}
      <div className="absolute top-0 left-0 right-0 h-10" style={{ WebkitAppRegion: 'drag' } as React.CSSProperties} />

      <div className="w-full max-w-md px-8">

        {/* ── WELCOME ── */}
        {step === 'welcome' && (
          <div className="flex flex-col items-center gap-8 text-center">
            <div className="w-20 h-20 rounded-3xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
              <Shield size={40} className="text-blue-400" />
            </div>
            <div>
              <h1 className="text-white font-bold text-2xl">CourtStrategies</h1>
              <p className="text-slate-400 text-sm mt-2">法律文書管理システムへようこそ</p>
            </div>
            <div className="w-full bg-slate-800/60 rounded-2xl p-5 text-left space-y-3">
              {[
                { icon: FolderOpen, text: '証拠文書・作業文書をローカル管理' },
                { icon: Sparkles, text: 'AI（Gemini）による要約・質問応答' },
                { icon: Scale, text: 'e-gov 法令・判例を横断検索' },
                { icon: Shield, text: 'すべてのデータはデバイス内に保存' }
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-3">
                  <Icon size={16} className="text-blue-400 flex-shrink-0" />
                  <span className="text-slate-300 text-sm">{text}</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => setStep('auth-choice')}
              className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              はじめる <ChevronRight size={18} />
            </button>
          </div>
        )}

        {/* ── AUTH CHOICE ── */}
        {step === 'auth-choice' && (
          <div className="flex flex-col items-center gap-6">
            <div className="text-center">
              <h2 className="text-white font-bold text-xl">認証方法を選択</h2>
              <p className="text-slate-400 text-sm mt-1">アプリ起動時の認証方法を設定します</p>
            </div>
            <div className="w-full space-y-3">
              {canUseBiometric && (
                <button
                  onClick={() => chooseMethod('biometric')}
                  className="w-full flex items-center gap-4 p-4 rounded-xl bg-blue-600/20 border border-blue-500/40 hover:bg-blue-600/30 transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-xl bg-blue-600/30 flex items-center justify-center flex-shrink-0">
                    <Fingerprint size={22} className="text-blue-400" />
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm">
                      {isMac ? 'Touch ID' : 'Windows Hello'}
                    </p>
                    <p className="text-slate-400 text-xs mt-0.5">生体認証でかんたんにロック解除</p>
                  </div>
                  <ChevronRight size={16} className="text-slate-500 ml-auto" />
                </button>
              )}
              <button
                onClick={() => chooseMethod('pin')}
                className="w-full flex items-center gap-4 p-4 rounded-xl bg-slate-700/40 border border-slate-600/40 hover:bg-slate-700/60 transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-slate-600/40 flex items-center justify-center flex-shrink-0">
                  <KeyRound size={20} className="text-slate-300" />
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">6桁 PIN</p>
                  <p className="text-slate-400 text-xs mt-0.5">数字6桁のPINでロック解除</p>
                </div>
                <ChevronRight size={16} className="text-slate-500 ml-auto" />
              </button>
              <button
                onClick={() => chooseMethod('none')}
                className="w-full flex items-center gap-4 p-4 rounded-xl bg-slate-800/40 border border-slate-700/40 hover:bg-slate-800/60 transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-slate-700/40 flex items-center justify-center flex-shrink-0">
                  <Shield size={18} className="text-slate-500" />
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">認証なし</p>
                  <p className="text-slate-400 text-xs mt-0.5">起動時に認証を求めません（非推奨）</p>
                </div>
                <ChevronRight size={16} className="text-slate-500 ml-auto" />
              </button>
            </div>
          </div>
        )}

        {/* ── PIN SETUP ── */}
        {step === 'pin-setup' && (
          <div className="flex flex-col items-center gap-5">
            <div className="text-center">
              <h2 className="text-white font-bold text-xl">PINを設定</h2>
              <p className="text-slate-400 text-sm mt-1">
                {pinPhase === 'enter' ? '6桁のPINを入力してください' : 'もう一度入力して確認'}
              </p>
            </div>

            {/* Dots */}
            <div className="flex gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className={`w-3 h-3 rounded-full border-2 transition-colors ${
                    i < currentPin.length
                      ? 'bg-blue-400 border-blue-400'
                      : 'border-slate-500 bg-transparent'
                  }`}
                />
              ))}
            </div>

            {pinError && (
              <div className="flex items-center gap-2 text-red-400 text-xs">
                <AlertCircle size={13} />
                {pinError}
              </div>
            )}

            {/* Keypad */}
            <div className="grid grid-cols-3 gap-3 w-full">
              {pinDigits.map((d, i) => (
                <button
                  key={i}
                  onClick={() => { if (d === '⌫') handlePinDelete(); else if (d !== '') handlePinKey(d) }}
                  disabled={d === ''}
                  className={`h-14 rounded-xl text-lg font-semibold transition-colors ${
                    d === '' ? 'cursor-default'
                      : d === '⌫' ? 'bg-slate-700/60 hover:bg-slate-600/60 text-slate-300'
                      : 'bg-slate-700/60 hover:bg-slate-600/60 text-white'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>

            {pinPhase === 'confirm' && pin === pinConfirm && pinConfirm.length === 6 && (
              <button
                onClick={confirmPinSetup}
                className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <Check size={18} /> PINを設定する
              </button>
            )}
          </div>
        )}

        {/* ── API KEY ── */}
        {step === 'api-key' && (
          <div className="flex flex-col gap-6">
            <div className="text-center">
              <div className="w-12 h-12 rounded-2xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center mx-auto mb-3">
                <Sparkles size={24} className="text-purple-400" />
              </div>
              <h2 className="text-white font-bold text-xl">Gemini API キー</h2>
              <p className="text-slate-400 text-sm mt-1">AI機能（要約・質問応答）の利用に必要です</p>
            </div>
            <div className="flex flex-col gap-3">
              <input
                type="password"
                value={apiKey}
                onChange={(e) => { setApiKey(e.target.value); setApiSaved(false) }}
                placeholder="AIzaSy..."
                className="w-full px-4 py-3 rounded-xl bg-slate-700/60 border border-slate-600/60 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
              <button
                onClick={saveApiKey}
                disabled={apiSaving || !apiKey}
                className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                {apiSaved ? <><Check size={16} /> 保存済み</> : apiSaving ? '保存中...' : 'APIキーを保存'}
              </button>
            </div>
            <p className="text-slate-500 text-xs text-center">
              スキップして後で設定 → 設定ページから変更できます
            </p>
            <button
              onClick={() => setStep('overview')}
              className="w-full py-3 rounded-xl border border-slate-600/60 text-slate-300 hover:bg-slate-700/40 text-sm transition-colors"
            >
              {apiSaved ? '次へ' : 'スキップ'}
            </button>
          </div>
        )}

        {/* ── OVERVIEW ── */}
        {step === 'overview' && (
          <div className="flex flex-col items-center gap-6">
            <div className="text-center">
              <h2 className="text-white font-bold text-xl">操作ガイド</h2>
              <p className="text-slate-400 text-sm mt-1">主な機能を確認してください</p>
            </div>
            <div className="w-full space-y-3">
              {[
                {
                  step: '1',
                  title: 'ドキュメントをインポート',
                  desc: 'サイドバー「ドキュメント」からPDF・画像・Wordファイルをインポート。ZIPやフォルダごとも可能。'
                },
                {
                  step: '2',
                  title: 'OCRとAI要約を実行',
                  desc: '文書を開き「OCR」タブで文字認識、「AI要約」タブでGeminiによる要約を生成。'
                },
                {
                  step: '3',
                  title: '全文検索で証拠を探す',
                  desc: '「検索」ページでキーワード検索。FTS5による高速検索で全文書を横断。'
                },
                {
                  step: '4',
                  title: '法令・判例を参照',
                  desc: '「法令検索」ページでe-gov法令APIを使った法令・判例リンクの検索が可能。'
                }
              ].map(({ step: s, title, desc }) => (
                <div key={s} className="flex gap-4 p-4 rounded-xl bg-slate-800/60 border border-slate-700/40">
                  <div className="w-7 h-7 rounded-full bg-blue-600 text-white text-sm font-bold flex items-center justify-center flex-shrink-0">
                    {s}
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm">{title}</p>
                    <p className="text-slate-400 text-xs mt-1">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={() => setStep('done')}
              className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              アプリを開始する <ChevronRight size={18} />
            </button>
          </div>
        )}

        {/* ── DONE ── */}
        {step === 'done' && (
          <div className="flex flex-col items-center gap-8 text-center">
            <div className="w-20 h-20 rounded-3xl bg-green-600/20 border border-green-500/30 flex items-center justify-center">
              <Check size={40} className="text-green-400" />
            </div>
            <div>
              <h2 className="text-white font-bold text-2xl">セットアップ完了</h2>
              <p className="text-slate-400 text-sm mt-2">
                {chosenMethod === 'biometric'
                  ? '生体認証が有効になりました。次回起動時から認証が必要です。'
                  : chosenMethod === 'pin'
                    ? 'PIN認証が有効になりました。次回起動時から認証が必要です。'
                    : '認証なしで設定されました。設定ページからいつでも変更できます。'}
              </p>
            </div>
            <button
              onClick={finish}
              disabled={finishing}
              className="w-full py-3.5 rounded-xl bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              {finishing ? '起動中...' : 'アプリを開く'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
