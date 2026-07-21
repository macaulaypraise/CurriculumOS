import { createContext, useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useParams } from 'react-router-dom'
import { setDemoModeHandler, type CurriculumPR } from './api/client'
import { LandingPage } from './components/LandingPage'
import { Layout } from './components/Layout'
import { SettingsModal } from './components/SettingsModal'
import { AssessmentsTab } from './pages/AssessmentsTab'
import { ChangesTab } from './pages/ChangesTab'
import { ComingSoon } from './pages/ComingSoon'
import { CoursesList } from './pages/CoursesList'
import { CurriculumTab } from './pages/CurriculumTab'
import { DebuggerTab } from './pages/DebuggerTab'
import { HistoryTab } from './pages/HistoryTab'
import { OverviewTab } from './pages/OverviewTab'
import { ProjectsList } from './pages/ProjectsList'

export interface PendingPR {
  id: string
  projectId: number
  courseId: number
  prompt: string
  proposal: CurriculumPR
  createdAt: string
}

interface AppContextValue {
  apiKey: string | null
  isDemoMode: boolean
  isJudgeMode: boolean
  pendingChanges: PendingPR[]
  setApiKey: (apiKey: string | null) => void
  setIsDemoMode: (isDemoMode: boolean) => void
  setIsJudgeMode: (isJudgeMode: boolean) => void
  addPendingChange: (pendingChange: PendingPR) => void
  removePendingChange: (pendingChangeId: string) => void
}

export const AppContext = createContext<AppContextValue | null>(null)

function WorkspaceRedirect() {
  const { projectId, courseId } = useParams()
  return <Navigate to={`/projects/${projectId}/courses/${courseId}/curriculum`} replace />
}

function AppRoutes({ apiKey, isDemoMode, setIsDemoMode, onOpenSettings }: Pick<AppContextValue, 'apiKey' | 'isDemoMode' | 'setIsDemoMode'> & { onOpenSettings: () => void }) {
  return (
    <Routes>
      <Route path="/" element={<LandingPage hasApiKey={Boolean(apiKey)} onDemo={() => setIsDemoMode(true)} onOpenSettings={onOpenSettings} />} />
      <Route path="/projects" element={<ProjectsList />} />
      <Route path="/projects/:projectId" element={<CoursesList />} />
      <Route path="/projects/:projectId/courses/:courseId/*" element={<Layout isDemoMode={isDemoMode} />}>
        <Route index element={<Navigate to="curriculum" replace />} />
        <Route path="workspace" element={<WorkspaceRedirect />} />
        <Route path="overview" element={<OverviewTab />} />
        <Route path="curriculum" element={<CurriculumTab />} />
        <Route path="assessments" element={<AssessmentsTab />} />
        <Route path="debugger" element={<DebuggerTab />} />
        <Route path="files" element={<ComingSoon title="Files" />} />
        <Route path="changes" element={<ChangesTab />} />
        <Route path="history" element={<HistoryTab />} />
        <Route path="settings" element={<ComingSoon title="Project Settings" />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  const [apiKey, setApiKey] = useState<string | null>(() => localStorage.getItem('curriculumos_openai_key'))
  const [isDemoMode, setIsDemoMode] = useState(false)
  const [isJudgeMode, setIsJudgeMode] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [pendingChanges, setPendingChanges] = useState<PendingPR[]>(() => {
    try {
      const savedChanges = localStorage.getItem('curriculumos_pending_changes')
      return savedChanges ? JSON.parse(savedChanges) as PendingPR[] : []
    } catch {
      return []
    }
  })

  useEffect(() => { setDemoModeHandler(setIsDemoMode) }, [])
  useEffect(() => { localStorage.setItem('curriculumos_pending_changes', JSON.stringify(pendingChanges)) }, [pendingChanges])

  const handleApiKeySaved = (key: string | null) => {
    setApiKey(key)
    setIsDemoMode(key === null)
  }
  const addPendingChange = (pendingChange: PendingPR) => setPendingChanges((changes) => [pendingChange, ...changes])
  const removePendingChange = (pendingChangeId: string) => setPendingChanges((changes) => changes.filter((change) => change.id !== pendingChangeId))

  return (
    <AppContext.Provider value={{ apiKey, isDemoMode, isJudgeMode, pendingChanges, setApiKey, setIsDemoMode, setIsJudgeMode, addPendingChange, removePendingChange }}>
      <BrowserRouter>
        <AppRoutes apiKey={apiKey} isDemoMode={isDemoMode} setIsDemoMode={setIsDemoMode} onOpenSettings={() => setIsSettingsOpen(true)} />
      </BrowserRouter>
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} onSaved={handleApiKeySaved} />
    </AppContext.Provider>
  )
}
