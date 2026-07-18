import { NavLink, Outlet, useParams } from 'react-router-dom'

interface LayoutProps {
  isDemoMode: boolean
}

const navigation = [
  { label: 'Overview', tab: 'overview' },
  { label: 'Curriculum', tab: 'curriculum' },
  { label: 'Assessments', tab: 'assessments' },
  { label: 'Files', tab: 'files' },
  { label: 'Changes', tab: 'changes' },
  { label: 'History', tab: 'history' },
  { label: 'Settings', tab: 'settings' },
]

export function Layout({ isDemoMode }: LayoutProps) {
  const { projectId } = useParams()
  const projectPath = `/projects/${projectId}`

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-950 text-zinc-100">
      <aside className="flex w-64 shrink-0 flex-col border-r border-zinc-800 bg-zinc-900/70 px-3 py-5">
        <NavLink to="/projects" className="px-3 pb-8">
          <p className="text-sm font-semibold tracking-tight text-zinc-100">CurriculumOS</p>
          <p className="mt-1 text-xs text-zinc-500">Project workspace</p>
        </NavLink>

        <nav className="space-y-1" aria-label="Project navigation">
          {navigation.map((item) => (
            <NavLink
              key={item.tab}
              to={`${projectPath}/${item.tab}`}
              className={({ isActive }) =>
                `flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                    : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-100'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto border-t border-zinc-800 px-3 pt-4 text-xs text-zinc-500">
          Project #{projectId}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-zinc-800 px-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">Projects</p>
            <p className="mt-0.5 text-sm font-medium text-zinc-200">Computer Science Degree Revision</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-2 text-xs text-zinc-400">
              <span className={`h-2 w-2 rounded-full ${isDemoMode ? 'bg-amber-400' : 'bg-emerald-400'}`} />
              {isDemoMode ? 'Demo Mode' : 'Live AI'}
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 text-xs font-semibold text-zinc-300">
              U
            </span>
          </div>
        </header>

        {isDemoMode && (
          <div className="border-b border-amber-500/20 bg-amber-500/5 px-6 py-2 text-xs text-amber-200">
            Running in Interactive Demo Mode. Data is pre-computed to showcase the workflow.
          </div>
        )}

        <main className="min-h-0 min-w-0 flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
