import type { ReactNode } from 'react'
import { BarChart3, BookOpen, Boxes, Cog, Sparkles } from 'lucide-react'

export type WorkspaceTab = 'graph' | 'assessments' | 'debugger'

interface LayoutProps {
  activeTab: WorkspaceTab
  isDemoMode: boolean
  onNavigate: (tab: WorkspaceTab) => void
  onOpenSettings: () => void
  children: ReactNode
}

const navItems: Array<{ id: WorkspaceTab; label: string; icon: typeof Boxes }> = [
  { id: 'graph', label: 'Curriculum Graph', icon: Boxes },
  { id: 'assessments', label: 'Assessments', icon: BookOpen },
  { id: 'debugger', label: 'Learning Debugger', icon: BarChart3 },
]

export function Layout({ activeTab, isDemoMode, onNavigate, onOpenSettings, children }: LayoutProps) {
  return (
    <div className="flex min-h-screen bg-zinc-950 text-zinc-100">
      <aside className="flex w-64 shrink-0 flex-col border-r border-zinc-800 bg-zinc-900 px-3 py-4">
        <div className="flex items-center gap-3 px-3 py-3"><div className="grid h-8 w-8 place-items-center rounded-lg bg-cyan-400 text-zinc-950"><Sparkles className="h-4 w-4" /></div><span className="text-sm font-semibold tracking-tight">CurriculumOS</span></div>
        <nav className="mt-8 space-y-1">{navItems.map((item) => { const Icon = item.icon; const active = activeTab === item.id; return <button key={item.id} type="button" onClick={() => onNavigate(item.id)} className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${active ? 'bg-zinc-800 text-zinc-100 shadow-sm' : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-100'}`}><Icon className="h-4 w-4" />{item.label}</button> })}</nav>
        <button type="button" onClick={onOpenSettings} className="mt-auto flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-100"><Cog className="h-4 w-4" />Settings</button>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-zinc-800 bg-zinc-950 px-8"><div className="text-sm text-zinc-400"><span>Workspace</span><span className="mx-2 text-zinc-700">/</span><span className="text-zinc-100">{navItems.find((item) => item.id === activeTab)?.label}</span></div><div className="flex items-center gap-5"><div className="flex items-center gap-2 text-xs font-medium text-zinc-400"><span className={`h-2 w-2 rounded-full ${isDemoMode ? 'bg-amber-400' : 'bg-emerald-400'}`} />{isDemoMode ? 'Demo Mode' : 'Live AI'}</div><div className="grid h-8 w-8 place-items-center rounded-full bg-zinc-800 text-xs font-semibold text-zinc-300">U</div></div></header>
        <main className="min-h-0 flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  )
}
