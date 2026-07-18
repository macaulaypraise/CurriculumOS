import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Background, Controls, MiniMap, ReactFlow, useEdgesState, useNodesState } from 'reactflow'
import { useParams } from 'react-router-dom'
import 'reactflow/dist/style.css'
import { approveChange, fetchProjectGraph, proposeChange, type CurriculumPR } from '../api/client'
import { mapCourseToFlow } from '../utils/graphMapper'

const riskStyles: Record<CurriculumPR['risk_level'], string> = {
  low: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  medium: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
  high: 'border-rose-500/30 bg-rose-500/10 text-rose-300',
}

export function CurriculumTab() {
  const { projectId } = useParams()
  const isValidProjectId = Boolean(projectId && Number.isInteger(Number(projectId)) && Number(projectId) > 0)
  const numericProjectId = Number(projectId)
  const [prompt, setPrompt] = useState('')
  const [pullRequest, setPullRequest] = useState<CurriculumPR | null>(null)
  const [approvalMessage, setApprovalMessage] = useState<string | null>(null)
  const queryClient = useQueryClient()
  const graphQuery = useQuery({
    queryKey: ['projects', projectId, 'graph'],
    queryFn: () => fetchProjectGraph(projectId as string),
    enabled: isValidProjectId,
  })
  const flow = useMemo(
    () => (graphQuery.data ? mapCourseToFlow(graphQuery.data) : { nodes: [], edges: [] }),
    [graphQuery.data],
  )
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])

  useEffect(() => {
    setNodes(flow.nodes)
    setEdges(flow.edges)
  }, [flow, setEdges, setNodes])

  const proposalMutation = useMutation({
    mutationFn: () => proposeChange(graphQuery.data?.id ?? 0, prompt.trim()),
    onSuccess: (proposal) => {
      setPullRequest(proposal)
      setApprovalMessage(null)
    },
  })

  const approvalMutation = useMutation({
    mutationFn: () => {
      if (!pullRequest || !isValidProjectId) throw new Error('No valid project or proposal is available.')
      return approveChange(numericProjectId, pullRequest.summary)
    },
    onSuccess: async () => {
      setPullRequest(null)
      setPrompt('')
      setApprovalMessage('Change approved and saved as a new curriculum version.')
      await queryClient.invalidateQueries({ queryKey: ['projects', projectId, 'versions'] })
    },
  })

  if (!isValidProjectId || graphQuery.isError) {
    return (
      <section className="flex min-h-[520px] items-center justify-center p-8">
        <div className="w-full max-w-xl rounded-2xl border border-rose-500/30 bg-rose-500/5 p-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-300">Curriculum unavailable</p>
          <h1 className="mt-3 text-xl font-semibold text-zinc-100">Failed to load curriculum graph</h1>
          <p className="mt-2 text-sm text-zinc-400">Check that the API is running and the selected project has been seeded.</p>
        </div>
      </section>
    )
  }

  if (graphQuery.isLoading || !graphQuery.data) {
    return <section className="p-8 text-sm text-zinc-400">Loading curriculum graph...</section>
  }

  const course = graphQuery.data

  return (
    <div className="grid h-full min-h-[640px] grid-cols-1 xl:grid-cols-[minmax(0,1fr)_380px]">
      <section className="relative min-h-[520px] border-b border-zinc-800 xl:border-b-0 xl:border-r">
        <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between border-b border-zinc-800 bg-zinc-950/80 px-6 py-4 backdrop-blur">
          <div>
            <h1 className="text-base font-semibold text-zinc-100">Curriculum Graph</h1>
            <p className="mt-1 text-xs text-zinc-400">{course.title}</p>
          </div>
          <span className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-xs text-zinc-400">{course.modules.length} modules</span>
        </div>

        <div className="h-full pt-[73px]">
          <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} fitView minZoom={0.2} className="bg-zinc-950">
            <Background color="#27272a" gap={20} />
            <Controls className="!border-zinc-700 !bg-zinc-900 !fill-zinc-300" />
            <MiniMap className="!border !border-zinc-700 !bg-zinc-900" nodeColor="#52525b" />
          </ReactFlow>
        </div>
      </section>

      <aside className="bg-zinc-900/40 p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-300">AI Engineer</p>
        <h2 className="mt-3 text-xl font-semibold text-zinc-100">Curriculum changes</h2>
        <p className="mt-2 text-sm leading-6 text-zinc-400">Request a dependency-aware curriculum update and review it as a pull request.</p>

        <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="Move recursion before trees..." className="mt-6 min-h-28 w-full resize-y rounded-xl border border-zinc-700 bg-zinc-950 p-3 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-600 focus:border-violet-400" />
        <button type="button" onClick={() => prompt.trim() && proposalMutation.mutate()} disabled={!prompt.trim() || proposalMutation.isPending} className="mt-3 w-full rounded-xl bg-violet-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-50">
          {proposalMutation.isPending ? 'Analyzing dependencies...' : 'Propose Change'}
        </button>

        {proposalMutation.isError && <p className="mt-3 text-sm text-rose-300">Unable to generate a curriculum pull request. Please try again.</p>}
        {approvalMessage && <p className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">{approvalMessage}</p>}

        {pullRequest && (
          <article className="mt-6 rounded-xl border border-zinc-700 bg-zinc-950 p-4 shadow-xl shadow-black/20">
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-sm font-semibold leading-6 text-zinc-100">Curriculum PR: {pullRequest.summary}</h3>
              <span className={`shrink-0 rounded-full border px-2 py-1 text-xs font-semibold capitalize ${riskStyles[pullRequest.risk_level]}`}>{pullRequest.risk_level} risk</span>
            </div>
            <div className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-zinc-500">Affected items</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-zinc-300">{pullRequest.affected_items.map((item) => <li key={item}>{item}</li>)}</ul>
            </div>
            <pre className="mt-4 max-h-64 overflow-x-auto whitespace-pre-wrap rounded-lg border border-zinc-800 bg-black p-3 font-mono text-xs leading-5 text-zinc-300">{pullRequest.generated_diff}</pre>
            <button type="button" onClick={() => approvalMutation.mutate()} disabled={approvalMutation.isPending} className="mt-4 w-full rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-zinc-950 transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50">
              {approvalMutation.isPending ? 'Saving version...' : 'Approve & Apply'}
            </button>
            {approvalMutation.isError && <p className="mt-3 text-sm text-rose-300">Approval could not be saved. Please try again.</p>}
          </article>
        )}
      </aside>
    </div>
  )
}
