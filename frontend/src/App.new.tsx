import { createContext, useEffect, useMemo, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Background, Controls, MiniMap, ReactFlow } from 'reactflow'

import { fetchCourse, setDemoModeHandler, type Course } from './api/client'
import { LandingPage } from './components/LandingPage'
import { Layout, type WorkspaceTab } from './components/Layout'
import { SettingsModal } from './components/SettingsModal'
import { mapCourseToFlow } from './utils/graphMapper'

interface AppContextValue { apiKey: string | null; isDemoMode: boolean; setIsDemoMode: (value: boolean) => void }
export const AppContext = createContext<AppContextValue | null>(null)

function App() {
  const [apiKey, setApiKey] = useState<string | null>(() => localStorage.getItem('curriculumos_openai_key'))
  const [isDemoMode, setIsDemoMode] = useState(false)
  const [course, setCourse] = useState<Course | null>(null)
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('graph')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [bannerVisible, setBannerVisible] = useState(true)
  const demoMutation = useMutation({ mutationFn: () => fetchCourse(1), onSuccess: (data) => { setCourse(data); setIsDemoMode(data.is_demo_mode === true); setBannerVisible(true) } })
  const graph = useMemo(() => (course ? mapCourseToFlow(course) : { nodes: [], edges: [] }), [course])

  useEffect(() => setDemoModeHandler(setIsDemoMode), [])

  const contextValue = { apiKey, isDemoMode, setIsDemoMode }
  const refreshKey = () => setApiKey(localStorage.getItem('curriculumos_openai_key'))

  const content = activeTab === 'graph' ? <div className="h-[calc(100vh-4rem)]"><ReactFlow nodes={graph.nodes} edges={graph.edges} fitView><Background color="#3f3f46" gap={20} /><Controls className="!border-zinc-700 !bg-zinc-900 !fill-zinc-100" /><MiniMap className="!bg-zinc-900" nodeColor="#22d3ee" maskColor="rgba(9,9,11,.7)" /></ReactFlow></div> : activeTab === 'assessments' ? <section className="mx-auto max-w-4xl p-10"><h1 className="text-2xl font-semibold">Assessment Compiler</h1><p className="mt-2 text-zinc-400">Module 1 · Data Structures</p><div className="mt-8 rounded-xl border border-zinc-800 bg-zinc-900 p-6"><h2 className="font-semibold">Pre-generated quiz</h2><ol className="mt-5 list-decimal space-y-4 pl-5 text-sm text-zinc-300"><li>Compare the operation costs of a linked list and a hash table.</li><li>Explain how a representation invariant protects a stack implementation.</li><li>Choose a collision-resolution strategy for a high-load dictionary.</li></ol><div className="mt-6 border-t border-zinc-800 pt-4 text-sm text-zinc-400">Rubric: accuracy 50% · complexity justification 30% · technical vocabulary 20%</div></div></section> : <section className="mx-auto max-w-4xl p-10"><h1 className="text-2xl font-semibold">Learning Debugger</h1><div className="mt-8 grid gap-5 md:grid-cols-2"><div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-6"><p className="text-sm text-rose-200">Class performance alert</p><p className="mt-2 text-4xl font-semibold">78%</p><p className="mt-1 text-sm text-zinc-400">of students failed Recursion</p></div><div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6"><p className="text-sm font-semibold">Recommended intervention</p><p className="mt-3 text-sm leading-6 text-zinc-400">Review prerequisite fluency in variables, function state, and call-stack tracing before assigning recursive backtracking.</p></div></div></section>

  return <AppContext.Provider value={contextValue}>{course === null ? <><LandingPage hasApiKey={apiKey !== null} onDemo={() => demoMutation.mutate()} onOpenSettings={() => setSettingsOpen(true)} />{demoMutation.isPending && <div className="fixed inset-x-0 bottom-8 mx-auto w-fit rounded-full border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm text-zinc-300">Loading Interactive Demo…</div>}</> : <Layout activeTab={activeTab} isDemoMode={isDemoMode} onNavigate={setActiveTab} onOpenSettings={() => setSettingsOpen(true)}>{isDemoMode && bannerVisible && <div className="flex items-center justify-between border-b border-amber-400/20 bg-amber-400/10 px-8 py-3 text-sm text-amber-100"><span>Running in Interactive Demo Mode. Data is pre-computed to showcase the workflow.</span><button type="button" onClick={() => setBannerVisible(false)} className="text-amber-200 hover:text-white">Dismiss</button></div>}{content}</Layout>}<SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} onSaved={refreshKey} /></AppContext.Provider>
}

export default App
