import { useEffect } from 'react'
import { createHashRouter, RouterProvider, Navigate } from 'react-router-dom'
import { useCaseStore, useSettingsStore, useAuthStore } from './store'
import CaseLayout from './components/layout/CaseLayout'
import DocumentsPage from './pages/DocumentsPage'
import DocumentDetailPage from './pages/DocumentDetailPage'
import SearchPage from './pages/SearchPage'
import NotesPage from './pages/NotesPage'
import AIFlashPage from './pages/AIFlashPage'
import LawSearchPage from './pages/LawSearchPage'
import SettingsPage from './pages/SettingsPage'
import BookmarksPage from './pages/BookmarksPage'
import ActivityPage from './pages/ActivityPage'
import LockScreen from './pages/LockScreen'
import WelcomeGuide from './pages/WelcomeGuide'

const router = createHashRouter([
  { path: '/', element: <Navigate to="/case/1/search" replace /> },
  { path: '/settings', element: <SettingsPage /> },
  {
    path: '/case/:caseId',
    element: <CaseLayout />,
    children: [
      { index: true, element: <Navigate to="search" replace /> },
      { path: 'documents', element: <DocumentsPage /> },
      { path: 'documents/:docId', element: <DocumentDetailPage /> },
      { path: 'search', element: <SearchPage /> },
      { path: 'notes', element: <NotesPage /> },
      { path: 'bookmarks', element: <BookmarksPage /> },
      { path: 'ai', element: <AIFlashPage /> },
      { path: 'law', element: <LawSearchPage /> },
      { path: 'activity', element: <ActivityPage /> }
    ]
  }
])

export default function App(): JSX.Element {
  const fetchCases = useCaseStore((s) => s.fetchCases)
  const loadSettings = useSettingsStore((s) => s.load)
  const { status, load: loadAuth } = useAuthStore()

  useEffect(() => {
    loadAuth()
  }, [loadAuth])

  useEffect(() => {
    if (status === 'unlocked') {
      fetchCases()
      loadSettings()
    }
  }, [status, fetchCases, loadSettings])

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (status === 'setup') return <WelcomeGuide />
  if (status === 'locked') return <LockScreen />

  return <RouterProvider router={router} />
}
