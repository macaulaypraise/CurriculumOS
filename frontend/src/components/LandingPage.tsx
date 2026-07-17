import { KeyRound, LockKeyhole, Sparkles } from 'lucide-react'

interface LandingPageProps {
  hasApiKey: boolean
  onDemo: () => void
  onOpenSettings: () => void
}

export function LandingPage({ hasApiKey, onDemo, onOpenSettings }: LandingPageProps) {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-8 text-slate-100">
      <nav className="mx-auto flex max-w-6xl items-center justify-between"><p className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-400">CurriculumOS</p><button type="button" onClick={onOpenSettings} className="flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800"><KeyRound className="h-4 w-4" />Settings</button></nav>
      <section className="mx-auto mt-24 max-w-4xl text-center"><p className="text-sm font-medium text-cyan-300">Curriculum engineering, made visible</p><h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-6xl">Turn curriculum decisions into transparent, reviewable systems.</h1><p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-slate-400">Explore a dependency-aware curriculum graph with precomputed demo scenarios, or bring your own OpenAI key for live processing.</p></section>
      <section className="mx-auto mt-14 grid max-w-5xl gap-6 md:grid-cols-2">
        <article className={`rounded-2xl border p-7 ${hasApiKey ? 'border-cyan-500/50 bg-slate-900' : 'border-slate-800 bg-slate-900/60 opacity-70'}`}><KeyRound className="h-6 w-6 text-cyan-400" /><h2 className="mt-5 text-xl font-semibold">Upload Curriculum (Live AI)</h2><p className="mt-3 text-sm leading-6 text-slate-400">Use your own key to process real curriculum content. File upload is not available in this demo build.</p>{hasApiKey ? <p className="mt-5 text-sm text-emerald-300">Live processing is enabled.</p> : <button type="button" onClick={onOpenSettings} className="mt-5 flex items-center gap-2 text-sm font-medium text-slate-300 hover:text-cyan-300"><LockKeyhole className="h-4 w-4" />Enter API Key in Settings to enable live processing.</button>}</article>
        <button type="button" onClick={onDemo} className="rounded-2xl border border-violet-500/50 bg-gradient-to-br from-violet-500/15 to-slate-900 p-7 text-left transition hover:border-violet-400 hover:bg-violet-500/20"><Sparkles className="h-6 w-6 text-violet-300" /><h2 className="mt-5 text-xl font-semibold">Explore Interactive Demo</h2><p className="mt-3 text-sm leading-6 text-slate-300">Open the Advanced Computer Science graph, precomputed change proposals, assessment compiler, and learning debugger.</p><p className="mt-5 text-sm font-semibold text-violet-200">Launch demo →</p></button>
      </section>
    </main>
  )
}
