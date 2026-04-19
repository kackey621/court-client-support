import { Outlet, useParams, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useCaseStore } from '../../store'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import FloatingAIButton from '../ai/FloatingAIButton'

export default function CaseLayout(): JSX.Element {
  const { caseId } = useParams<{ caseId: string }>()
  const { cases, setActiveCase, activeCaseId } = useCaseStore()

  useEffect(() => {
    const id = Number(caseId)
    if (!isNaN(id) && id !== activeCaseId) {
      setActiveCase(id)
    }
  }, [caseId, setActiveCase, activeCaseId])

  if (cases.length > 0 && !cases.find((c) => c.id === Number(caseId))) {
    return <Navigate to="/case/1/search" replace />
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar caseId={Number(caseId)} />
      <div className="flex flex-col flex-1 overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
      <FloatingAIButton />
    </div>
  )
}
