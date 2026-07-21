import { useContext } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { AppContext, type PendingPR } from '../App'
import { approveChange } from '../api/client'

const riskStyles: Record<PendingPR['proposal']['risk_level'], string> = {
  low: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  medium: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
  high: 'border-rose-500/30 bg-rose-500/10 text-rose-300'
}

function Diff({ value }: { value: string }) {
  return (
    <pre className="mt-4 max-h-64 overflow-x-auto whitespace-pre-wrap rounded-lg border border-zinc-800 bg-black p-4 text-xs font-mono leading-6">
      {value.split('\n').map((line, index) => {
        const color = line.startsWith('+') ? 'text-emerald-400' : line.startsWith('-') ? 'text-rose-400' : line.startsWith('@@') ? 'text-cyan-400' : line.startsWith('!') ? 'text-amber-400' : 'text-zinc-400'
        return <div key={`${line}-${index}`} className={color}>{line || '\u00a0'}</div>
      })}
    </pre>
  )
}

export function ChangesTab() {
  const { projectId, courseId } = useParams()
  const context = useContext(AppContext)
  const queryClient = useQueryClient()
  const numericProjectId = Number(projectId)
  const numericCourseId = Number(courseId)
  const pendingChanges = context?.pendingChanges.filter((change) => change.projectId === numericProjectId && change.courseId === numericCourseId) ?? []

  const approvalMutation = useMutation({
    mutationFn: (change: PendingPR) => approveChange(numericProjectId, change.prompt, numericCourseId),
    onSuccess: async (_result, change) => {
      context?.removePendingChange(change.id)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['courseGraph', courseId] }),
        queryClient.invalidateQueries({ queryKey: ['projects', projectId, 'versions'] }),
        queryClient.invalidateQueries({ queryKey: ['projects', projectId, 'activity'] })
      ])
      toast.success('Curriculum Updated & Version Created')
    },
    onError: (error: any) => toast.error(error?.response?.data?.detail ?? 'Unable to apply this curriculum change.')
  })

  return (
    <section className="mx-auto w-full max-w-5xl p-6 lg:p-10">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-zinc-800 pb-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-300">Curriculum Pull Requests</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-100">Pending changes</h1>
          <p className="mt-2 text-sm text-zinc-400">Review dependency-aware proposals before they become immutable curriculum versions.</p>
        </div>
        <span className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-300">{pendingChanges.length} pending</span>
      </div>

      {pendingChanges.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-zinc-700 bg-zinc-900/30 px-6 py-16 text-center">
          <p className="text-lg font-semibold text-zinc-200">No pending changes</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-zinc-400">Propose a change in the Curriculum tab to see it here.</p>
        </div>
      ) : (
        <div className="mt-8 space-y-5">
          {pendingChanges.map((change) => (
            <article key={change.id} className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 shadow-lg shadow-black/10">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">Proposed {new Date(change.createdAt).toLocaleString()}</p>
                  <h2 className="mt-2 text-lg font-semibold text-zinc-100">Curriculum PR: {change.proposal.summary}</h2>
                </div>
                <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${riskStyles[change.proposal.risk_level]}`}>{change.proposal.risk_level} risk</span>
              </div>
              <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">Affected items</p>
                  <ul className="mt-3 space-y-2 text-sm text-zinc-300">
                    {change.proposal.affected_items.map((item) => <li key={item} className="flex gap-2"><span className="text-cyan-400">&bull;</span>{item}</li>)}
                  </ul>
                </div>
                <Diff value={change.proposal.generated_diff} />
              </div>
              <div className="mt-5 flex flex-wrap justify-end gap-3 border-t border-zinc-800 pt-5">
                <button type="button" onClick={() => { context?.removePendingChange(change.id); toast.info('Change dismissed') }} disabled={approvalMutation.isPending} className="rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-2 text-sm font-semibold text-zinc-300 transition duration-200 ease-out hover:scale-[1.02] hover:bg-zinc-800 disabled:opacity-50">Dismiss</button>
                <button type="button" onClick={() => approvalMutation.mutate(change)} disabled={approvalMutation.isPending} className="rounded-lg bg-emerald-400 px-4 py-2 text-sm font-semibold text-zinc-950 transition duration-200 ease-out hover:scale-[1.02] hover:bg-emerald-300 disabled:opacity-50">{approvalMutation.isPending ? 'Applying...' : 'Approve & Apply'}</button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
