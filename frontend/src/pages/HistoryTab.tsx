import { useQuery } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import { fetchProjectVersions } from '../api/client'

function formatRelativeTime(timestamp: string): string {
  const elapsedSeconds = Math.max(0, Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000))
  if (elapsedSeconds < 60) return 'just now'
  if (elapsedSeconds < 3600) return `${Math.floor(elapsedSeconds / 60)} mins ago`
  if (elapsedSeconds < 86400) return `${Math.floor(elapsedSeconds / 3600)} hours ago`
  return `${Math.floor(elapsedSeconds / 86400)} days ago`
}

export function HistoryTab() {
  const { projectId } = useParams()
  const isValidProjectId = Boolean(projectId && Number.isInteger(Number(projectId)) && Number(projectId) > 0)
  const versionsQuery = useQuery({
    queryKey: ['projects', projectId, 'versions'],
    queryFn: () => fetchProjectVersions(projectId as string),
    enabled: isValidProjectId,
  })

  if (!isValidProjectId || versionsQuery.isError) {
    return (
      <section className="flex min-h-[420px] items-center justify-center p-8">
        <div className="w-full max-w-xl rounded-2xl border border-rose-500/30 bg-rose-500/5 p-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-300">History unavailable</p>
          <h1 className="mt-3 text-xl font-semibold text-zinc-100">Failed to load version history</h1>
          <p className="mt-2 text-sm text-zinc-400">Check that the API is running and the selected project has been seeded.</p>
        </div>
      </section>
    )
  }

  if (versionsQuery.isLoading) {
    return <section className="p-8 text-sm text-zinc-400">Loading version history...</section>
  }

  const versions = versionsQuery.data ?? []

  return (
    <section className="mx-auto w-full max-w-4xl p-6 sm:p-10">
      <div className="border-b border-zinc-800 pb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400">Project history</p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-zinc-100">Curriculum versions</h1>
        <p className="mt-2 text-sm text-zinc-400">Immutable records of approved curriculum decisions.</p>
      </div>

      {versions.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-zinc-700 bg-zinc-900/40 p-8 text-center text-sm text-zinc-400">
          No curriculum versions have been recorded yet.
        </div>
      ) : (
        <ol className="mt-8 border-l border-zinc-800">
          {versions.map((version) => (
            <li key={version.id} className="relative ml-6 pb-8 last:pb-0">
              <span className="absolute -left-[31px] top-1.5 h-3 w-3 rounded-full border-2 border-zinc-950 bg-cyan-400 ring-1 ring-cyan-400/40" />
              <article className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 shadow-lg shadow-black/10">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <h2 className="text-sm font-semibold text-zinc-100">Version {version.version_number}</h2>
                  <span className="text-xs text-zinc-500">•</span>
                  <span className="text-xs text-zinc-400">{formatRelativeTime(version.created_at)}</span>
                </div>
                <p className="mt-2 text-sm text-zinc-300">{version.description}</p>
              </article>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
