import { useNavigate } from 'react-router-dom'

interface LandingPageProps {
  hasApiKey: boolean
  onDemo: () => void
  onOpenSettings: () => void
}

export function LandingPage({ hasApiKey, onDemo, onOpenSettings }: LandingPageProps) {
  const navigate = useNavigate()
  const openDemo = () => {
    onDemo()
    navigate('/projects/1')
  }

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-10 text-zinc-100 sm:px-10">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl flex-col justify-center">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-400">CurriculumOS</p>
        <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">Engineer curriculum systems that can evolve safely.</h1>
        <p className="mt-5 max-w-2xl text-base leading-7 text-zinc-400">Turn course documents into dependency-aware curriculum graphs, review changes as pull requests, and preserve every decision as history.</p>
        <div className="mt-12 grid gap-5 lg:grid-cols-2">
          <button type="button" onClick={() => navigate('/projects')} className="rounded-2xl border border-cyan-500/40 bg-zinc-900 p-7 text-left transition duration-200 ease-out hover:-translate-y-0.5 hover:border-cyan-400 hover:shadow-xl hover:shadow-cyan-500/10"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400">Enterprise workflow</p><h2 className="mt-3 text-2xl font-semibold">Start New Project</h2><p className="mt-3 text-sm leading-6 text-zinc-400">Create a project workspace, add curriculum sources, and use your own provider key when you are ready for Live AI extraction.</p><p className="mt-6 text-sm font-medium text-zinc-200">Open projects →</p></button>
          <button type="button" onClick={openDemo} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-7 text-left transition duration-200 ease-out hover:-translate-y-0.5 hover:border-violet-400 hover:shadow-xl hover:shadow-violet-500/10"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-300">Interactive Demo</p><h2 className="mt-3 text-2xl font-semibold">Explore Demo Workspace</h2><p className="mt-3 text-sm leading-6 text-zinc-400">Open the seeded Computer Science project, then choose its Advanced Computer Science course.</p><p className="mt-6 text-sm font-medium text-zinc-200">Open demo →</p></button>
        </div>
        {!hasApiKey && <button type="button" onClick={onOpenSettings} className="mt-7 w-fit text-sm text-zinc-400 underline decoration-zinc-700 underline-offset-4 transition hover:text-zinc-200">Add an AI provider key in Settings for Live AI extraction</button>}
      </div>
    </main>
  )
}
