import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { fetchProjectVersions, revertProjectVersion } from '../api/client'

function formatRelativeTime(timestamp: string): string {
  const elapsedSeconds = Math.max(0, Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000))
  if (elapsedSeconds < 60) return 'just now'
  if (elapsedSeconds < 3600) return Math.floor(elapsedSeconds / 60) + ' mins ago'
  if (elapsedSeconds < 86400) return Math.floor(elapsedSeconds / 3600) + ' hours ago'
  return Math.floor(elapsedSeconds / 86400) + ' days ago'
}

export function HistoryTab() {
  const { projectId, courseId } = useParams()
  const numericProjectId = Number(projectId)
  const isValidProjectId = Boolean(projectId && Number.isInteger(numericProjectId) && numericProjectId > 0)
  const queryClient = useQueryClient()
  const versionsQuery = useQuery({
    queryKey: ['projects', projectId, 'versions'],
    queryFn: () => fetchProjectVersions(projectId as string),
    enabled: isValidProjectId,
  })
  const revertMutation = useMutation({
    mutationFn: (versionNumber: number) => revertProjectVersion(numericProjectId, versionNumber),
    onSuccess: async (_, versionNumber) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['projects', projectId, 'versions'] }),
        queryClient.invalidateQueries({ queryKey: ['courseGraph', courseId] }),
        queryClient.invalidateQueries({ queryKey: ['projects', projectId, 'activity'] }),
      ])
      toast.success('Time-travel complete. Reverted to Version ' + versionNumber)
    },
    onError: () => toast.error('Unable to revert this version. The current version is unchanged.'),
  })

  if (!isValidProjectId || versionsQuery.isError) {
    return <section className="flex min-h-[420px] items-center justify-center p-8"><div className="w-full max-w-xl rounded-2xl border border-rose-500/30 bg-rose-500/5 p-8 text-center"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-300">History unavailable</p><h1 className="mt-3 text-xl font-semibold text-zinc-100">Failed to load version history</h1><p className="mt-2 text-sm text-zinc-400">Check that the API is running and the selected project has been seeded.</p></div></section>
  }
  if (versionsQuery.isLoading) return <section className="p-8 text-sm text-zinc-400">Loading version history...</section>

  const versions = versionsQuery.data ?? []
  const activeVersionNumber = versions.reduce((latest, version) => Math.max(latest, version.version_number), 0)

  return (
    <section className="mx-auto w-full max-w-4xl p-6 sm:p-10">
      <div className="border-b border-zinc-800 pb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400">Project history</p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-zinc-100">Curriculum versions</h1>
        <p className="mt-2 text-sm text-zinc-400">Immutable records of approved curriculum decisions. Restoring a version creates a new record.</p>
      </div>
      {versions.length === 0 ? <div className="mt-8 rounded-xl border border-dashed border-zinc-700 bg-zinc-900/40 p-8 text-center text-sm text-zinc-400">No curriculum versions have been recorded yet.</div> : (
        <ol className="mt-8 border-l border-zinc-800">
          {versions.map((version) => {
            const isActive = version.version_number === activeVersionNumber
            const isRevert = version.description.startsWith('Reverted to version')
            return <li key={version.id} className="relative ml-6 pb-8 last:pb-0">
              <span className="absolute -left-[31px] top-1.5 h-3 w-3 rounded-full border-2 border-zinc-950 bg-cyan-400 ring-1 ring-cyan-400/40" />
              <article className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 shadow-lg shadow-black/10">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div><div className="flex flex-wrap items-center gap-x-3 gap-y-1"><h2 className="text-sm font-semibold text-zinc-100">Version {version.version_number}</h2>{isActive && <span className="rounded-full bg-cyan-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-cyan-300">Current</span>}{isRevert && <span className="rounded-full bg-violet-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-300">Revert</span>}<span className="text-xs text-zinc-400">{formatRelativeTime(version.created_at)}</span></div><p className="mt-2 text-sm text-zinc-300">{version.description}</p></div>
                  {!isActive && <button type="button" onClick={() => revertMutation.mutate(version.version_number)} disabled={revertMutation.isPending} className="shrink-0 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-xs font-semibold text-cyan-300 transition hover:bg-cyan-500/20 disabled:opacity-50">{revertMutation.isPending ? 'Restoring...' : 'Revert to this Version'}</button>}
                </div>
              </article>
            </li>
          })}
        </ol>
      )}
    </section>
  )
}
