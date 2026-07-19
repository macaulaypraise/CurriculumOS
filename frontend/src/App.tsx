import { createContext, useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useParams } from 'react-router-dom'
import { setDemoModeHandler } from './api/client'
import { LandingPage } from './components/LandingPage'
import { Layout } from './components/Layout'
import { SettingsModal } from './components/SettingsModal'
import { AssessmentsTab } from './pages/AssessmentsTab'
import { ComingSoon } from './pages/ComingSoon'
import { CoursesList } from './pages/CoursesList'
import { CurriculumTab } from './pages/CurriculumTab'
import { DebuggerTab } from './pages/DebuggerTab'
import { HistoryTab } from './pages/HistoryTab'
import { OverviewTab } from './pages/OverviewTab'
import { ProjectsList } from './pages/ProjectsList'

interface AppContextValue { apiKey: string | null; isDemoMode: boolean; isJudgeMode: boolean; setApiKey: (apiKey: string | null) => void; setIsDemoMode: (isDemoMode: boolean) => void; setIsJudgeMode: (isJudgeMode: boolean) => void }
export const AppContext = createContext<AppContextValue | null>(null)

function WorkspaceRedirect() { const { projectId, courseId } = useParams(); return <Navigate to={`/projects/${projectId}/courses/${courseId}/curriculum`} replace /> }
function AppRoutes({ apiKey, isDemoMode, setIsDemoMode, onOpenSettings }: Pick<AppContextValue, 'apiKey' | 'isDemoMode' | 'setIsDemoMode'> & { onOpenSettings: () => void }) {
  return <Routes><Route path="/" element={<LandingPage hasApiKey={Boolean(apiKey)} onDemo={() => setIsDemoMode(true)} onOpenSettings={onOpenSettings} />} /><Route path="/projects" element={<ProjectsList />} /><Route path="/projects/:projectId" element={<CoursesList />} /><Route path="/projects/:projectId/courses/:courseId/*" element={<Layout isDemoMode={isDemoMode} />}><Route index element={<Navigate to="curriculum" replace />} /><Route path="workspace" element={<WorkspaceRedirect />} /><Route path="overview" element={<OverviewTab />} /><Route path="curriculum" element={<CurriculumTab />} /><Route path="assessments" element={<AssessmentsTab />} /><Route path="debugger" element={<DebuggerTab />} /><Route path="files" element={<ComingSoon title="Files" />} /><Route path="changes" element={<ComingSoon title="Changes" />} /><Route path="history" element={<HistoryTab />} /><Route path="settings" element={<ComingSoon title="Project Settings" />} /></Route><Route path="*" element={<Navigate to="/" replace />} /></Routes>
}

export default function App() {
  const [apiKey, setApiKey] = useState<string | null>(() => localStorage.getItem('curriculumos_openai_key')); const [isDemoMode, setIsDemoMode] = useState(false); const [isJudgeMode, setIsJudgeMode] = useState(false); const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  useEffect(() => { setDemoModeHandler(setIsDemoMode) }, [])
  const handleApiKeySaved = (key: string | null) => { setApiKey(key); setIsDemoMode(key === null) }
  return <AppContext.Provider value={{ apiKey, isDemoMode, isJudgeMode, setApiKey, setIsDemoMode, setIsJudgeMode }}><BrowserRouter><AppRoutes apiKey={apiKey} isDemoMode={isDemoMode} setIsDemoMode={setIsDemoMode} onOpenSettings={() => setIsSettingsOpen(true)} /></BrowserRouter><SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} onSaved={handleApiKeySaved} /></AppContext.Provider>
}
