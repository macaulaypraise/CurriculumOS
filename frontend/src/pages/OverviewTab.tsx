import { useQuery } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import { fetchProjectActivity, fetchProjectGraph, fetchProjectVersions } from '../api/client'

function relativeTime(timestamp: string): string {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000))
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)} mins ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`
  return `${Math.floor(seconds / 86400)} days ago`
}

const eventGlyph: Record<string, string> = {
  project_created: '✦',
  curriculum_extracted: '⌘',
  version_created: '↗',
  assessment_generated: '✓',
}

export function OverviewTab() {
  const { projectId } = useParams()
  const validProjectId = Boolean(projectId && Number.isInteger(Number(projectId)) && Number(projectId) > 0)
  const graphQuery = useQuery({
    queryKey: ['projects', projectId, 'graph'],
    queryFn: () => fetchProjectGraph(projectId as string),
    enabled: validProjectId,
  })
  const versionsQuery = useQuery({
    queryKey: ['projects', projectId, 'versions'],
    queryFn: () => fetchProjectVersions(projectId as string),
    enabled: validProjectId,
  })
  const activityQuery = useQuery({
    queryKey: ['projects', projectId, 'activity'],
    queryFn: () => fetchProjectActivity(projectId as string),
    enabled: validProjectId,
  })

  if (!validProjectId || graphQuery.isError || versionsQuery.isError || activityQuery.isError) {
    return (
      <section className="flex min-h-[440px] items-center justify-center p-8">
        <div className="w-full max-w-xl rounded-2xl border border-rose-500/30 bg-rose-500/5 p-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-300">Overview unavailable</p>
          <h1 className="mt-3 text-xl font-semibold text-zinc-100">Failed to load project dashboard</h1>
          <p className="mt-2 text-sm text-zinc-400">Check that the API is running and the demo project has been seeded.</p>
        </div>
      </section>
    )
  }

  if (graphQuery.isLoading || versionsQuery.isLoading || activityQuery.isLoading) {
    return <section className="p-8 text-sm text-zinc-400">Loading project overview...</section>
  }

  const graph = graphQuery.data
  const lessonCount = graph?.modules.reduce((total, module) => total + module.lessons.length, 0) ?? 0
  const stats = [
    { label: 'Modules', value: graph?.modules.length ?? 0, accent: 'text-cyan-300' },
    { label: 'Lessons', value: lessonCount, accent: 'text-violet-300' },
    { label: 'Versions', value: versionsQuery.data?.length ?? 0, accent: 'text-emerald-300' },
  ]

  return (
    <section className="mx-auto w-full max-w-6xl p-6 sm:p-10">
      <div className="border-b border-zinc-800 pb-7">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400">Project overview</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-100">{graph?.title ?? 'Curriculum Workspace'}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">{graph?.description}</p>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <article key={stat.label} className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 shadow-lg shadow-black/10">
            <p className="text-sm text-zinc-400">{stat.label}</p>
            <p className={`mt-3 text-3xl font-semibold tracking-tight ${stat.accent}`}>{stat.value}</p>
          </article>
        ))}
      </div>

      <div className="mt-10 max-w-3xl">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
          <div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400">Activity</p><h2 className="mt-2 text-xl font-semibold text-zinc-100">Project activity</h2></div>
          <span className="text-xs text-zinc-500">Latest events</span>
        </div>

        {activityQuery.data?.length ? (
          <ol className="mt-7 border-l border-zinc-800">
            {activityQuery.data.map((event) => (
              <li key={event.id} className="relative ml-6 pb-7 last:pb-0">
                <span className="absolute -left-[31px] top-0 flex h-4 w-4 items-center justify-center rounded-full border-2 border-zinc-950 bg-cyan-400 text-[8px] font-bold text-zinc-950 ring-1 ring-cyan-400/40">
                  {eventGlyph[event.event_type] ?? '•'}
                </span>
                <article className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
                  <p className="text-sm font-medium text-zinc-200">{event.description}</p>
                  <p className="mt-1 text-xs text-zinc-500">{relativeTime(event.created_at)}</p>
                </article>
              </li>
            ))}
          </ol>
        ) : (
          <div className="mt-7 rounded-xl border border-dashed border-zinc-700 bg-zinc-900/30 p-6 text-sm text-zinc-400">No activity has been recorded yet.</div>
        )}
      </div>
    </section>
  )
}
