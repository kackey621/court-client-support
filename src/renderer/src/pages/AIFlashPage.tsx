import { useParams } from 'react-router-dom'
import AIFlashPanel from '../components/ai/AIFlashPanel'
import { useSettingsStore } from '../store'
import { AlertCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function AIFlashPage(): JSX.Element {
  const { caseId } = useParams<{ caseId: string }>()
  const navigate = useNavigate()
  const { geminiApiKey } = useSettingsStore()

  if (!geminiApiKey) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <AlertCircle size={32} className="text-yellow-400" />
        <p className="text-sm text-gray-600">
          AI Flash を使用するには Gemini API キーが必要です
        </p>
        <button onClick={() => navigate('/settings')} className="btn-primary text-sm">
          設定画面へ
        </button>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col -m-6 p-6">
      <h1 className="text-lg font-bold text-gray-900 mb-4 flex-shrink-0">AI Flash</h1>
      <div className="flex-1 overflow-hidden card p-4">
        <AIFlashPanel caseId={Number(caseId)} />
      </div>
    </div>
  )
}
