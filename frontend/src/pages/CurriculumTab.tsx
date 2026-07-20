import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Background, BackgroundVariant, Controls, MarkerType, MiniMap, ReactFlow, ReactFlowProvider, useEdgesState, useNodesInitialized, useNodesState, useReactFlow, type Edge, type Node } from 'reactflow'
import { useLocation, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import 'reactflow/dist/style.css'
import { AppContext } from '../App'
import { approveChange, fetchProjectGraph, proposeChange, type CurriculumPR } from '../api/client'
import { LessonNode } from '../components/graph/LessonNode'
import { ModuleNode } from '../components/graph/ModuleNode'
import { OutcomeNode } from '../components/graph/OutcomeNode'
import { getLayoutedElements } from '../utils/graphLayout'

const nodeTypes = { module: ModuleNode, lesson: LessonNode, outcome: OutcomeNode }
const inactiveEdgeStyle = { stroke: '#52525b', strokeWidth: 2, opacity: 0.4 }
const riskStyles: Record<CurriculumPR['risk_level'], string> = { low: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300', medium: 'border-amber-500/30 bg-amber-500/10 text-amber-300', high: 'border-rose-500/30 bg-rose-500/10 text-rose-300' }

function GraphCanvas({ nodes, edges, onNodesChange, onEdgesChange, onAutoLayout, revision }: { nodes: Node[]; edges: Edge[]; onNodesChange: Parameters<typeof ReactFlow>[0]['onNodesChange']; onEdgesChange: Parameters<typeof ReactFlow>[0]['onEdgesChange']; onAutoLayout: () => void; revision: number }) {
  const { fitView } = useReactFlow(); const initialized = useNodesInitialized()
  useEffect(() => { if (!initialized || !nodes.length) return; const frame = requestAnimationFrame(() => fitView({ padding: 0.25, duration: 800 })); return () => cancelAnimationFrame(frame) }, [fitView, initialized, nodes.length, revision])
  return <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} fitView className="bg-zinc-950"><Background variant={BackgroundVariant.Dots} color="#27272a" gap={20} size={1} /><Controls className="!border-zinc-700 !bg-zinc-900 !fill-zinc-300" /><MiniMap className="!border !border-zinc-700 !bg-zinc-900" nodeColor={(node) => node.type === 'module' ? '#06b6d4' : '#52525b'} maskColor="rgba(9,9,11,.72)" /><div className="absolute bottom-5 right-5 z-10 flex overflow-hidden rounded-lg border border-zinc-700 bg-zinc-900"><button type="button" onClick={() => fitView({ padding: 0.25, duration: 800 })} className="border-r border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800">Fit View</button><button type="button" onClick={onAutoLayout} className="px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800">Auto Layout</button></div></ReactFlow>
}

export function CurriculumTab() {
  const { projectId, courseId } = useParams(); const location = useLocation() as { state?: { prompt?: string } }; const appContext = useContext(AppContext); const isJudgeMode = appContext?.isJudgeMode ?? false
  const numericProjectId = Number(projectId); const numericCourseId = Number(courseId); const validProject = Boolean(projectId && numericProjectId > 0); const validCourse = Boolean(courseId && numericCourseId > 0)
  const [prompt, setPrompt] = useState(''); const [pullRequest, setPullRequest] = useState<CurriculumPR | null>(null); const [approvalMessage, setApprovalMessage] = useState<string | null>(null); const [revision, setRevision] = useState(0); const loadedCourse = useRef<number | null>(null); const queryClient = useQueryClient()
  const graphQuery = useQuery({ queryKey: ['projectGraph', projectId], queryFn: () => fetchProjectGraph(projectId as string), enabled: validProject })
  useEffect(() => { if (location.state?.prompt) setPrompt(location.state.prompt) }, [location.state?.prompt])
  const layout = useMemo(() => { if (!graphQuery.data) return { nodes: [] as Node[], edges: [] as Edge[] }; const nodes: Node[] = []; const edges: Edge[] = []; graphQuery.data.modules.forEach((module) => { const moduleId = `module-${module.id}`; nodes.push({ id: moduleId, type: 'module', position: { x: 0, y: 0 }, data: { title: module.title, description: module.description, lessonCount: module.lessons.length, outcomeCount: module.learning_outcomes.length, status: 'current' } }); let parent = moduleId; module.lessons.forEach((lesson) => { const id = `lesson-${lesson.id}`; nodes.push({ id, type: 'lesson', position: { x: 0, y: 0 }, data: { title: lesson.title } }); edges.push({ id: `${parent}-${id}`, source: parent, target: id, animated: true, style: inactiveEdgeStyle, markerEnd: { type: MarkerType.ArrowClosed, color: '#52525b' } }); parent = id }); module.learning_outcomes.forEach((outcome) => { const id = `outcome-${outcome.id}`; nodes.push({ id, type: 'outcome', position: { x: 0, y: 0 }, data: { statement: outcome.statement } }); edges.push({ id: `${parent}-${id}`, source: parent, target: id, animated: true, style: inactiveEdgeStyle, markerEnd: { type: MarkerType.ArrowClosed, color: '#52525b' } }) }) }); return getLayoutedElements(nodes, edges) }, [graphQuery.data])
  const [nodes, setNodes, onNodesChange] = useNodesState([]); const [edges, setEdges, onEdgesChange] = useEdgesState([])
  useEffect(() => { setNodes(layout.nodes); setEdges(layout.edges); setRevision((value) => value + 1); if (graphQuery.data?.id && loadedCourse.current !== graphQuery.data.id) { loadedCourse.current = graphQuery.data.id; toast.success('Curriculum Graph Loaded') } }, [graphQuery.data?.id, layout, setEdges, setNodes])
  const autoLayout = useCallback(() => { const next = getLayoutedElements(nodes, edges); setNodes(next.nodes); setEdges(next.edges); setRevision((value) => value + 1); toast.success('Graph layout updated') }, [edges, nodes, setEdges, setNodes])
  const proposalMutation = useMutation({ mutationFn: () => proposeChange(numericCourseId, prompt.trim()), onMutate: () => toast.info('Generating Proposal...'), onSuccess: (proposal) => { setPullRequest(proposal); setApprovalMessage(null); localStorage.setItem('curriculumos_pr_generated', 'true'); window.dispatchEvent(new Event('curriculumos-progress')); toast.success('Curriculum Pull Request ready') } })
  const approvalMutation = useMutation({
  mutationFn: () => {
    if (!pullRequest) throw new Error('No proposal is available.');
    return approveChange(numericProjectId, pullRequest.summary)
  },
  onSuccess: async () => {
    setPullRequest(null);
    setPrompt('');
    setApprovalMessage('Change approved and saved as a new curriculum version.');
    await Promise.all([
      queryClient.invalidateQueries({ queryKey:  ['projectGraph', projectId] }),
      queryClient.invalidateQueries({ queryKey: ['projects', projectId, 'versions'] }),
      queryClient.invalidateQueries({ queryKey: ['projects', projectId,  'activity'] })
    ]);
    toast.success('Curriculum Updated & Version Created')
  },
  onError: (error: any) => {
    console.error("Approval Mutation Failed:", error);
    toast.error(`Backend Error: ${error?.response?.data?.detail || error.message}`);
  }
})
  if (!validProject || !validCourse || graphQuery.isError) return <section className="flex min-h-[520px] items-center justify-center p-8"><div className="rounded-2xl border border-rose-500/30 bg-rose-500/5 p-8 text-center"><p className="text-sm text-rose-300">Failed to load curriculum graph</p></div></section>
  if (graphQuery.isLoading || !graphQuery.data) return <section className="p-8 text-sm text-zinc-400">Loading curriculum graph...</section>
  const modules = graphQuery.data.modules.length; const lessons = graphQuery.data.modules.reduce((sum, module) => sum + module.lessons.length, 0); const outcomes = graphQuery.data.modules.reduce((sum, module) => sum + module.learning_outcomes.length, 0)
  return <div className="grid h-full min-h-[640px] grid-cols-1 xl:grid-cols-[minmax(0,1fr)_380px]"><section className="relative min-h-[620px] border-b border-zinc-800 xl:border-b-0 xl:border-r"><div className="absolute inset-x-0 top-0 z-10 flex items-center gap-3 border-b border-zinc-800 bg-zinc-950/90 px-6 py-3"><h1 className="text-sm font-semibold">Curriculum Graph</h1><p className="text-xs text-zinc-400">{modules} Modules • {lessons} Lessons • {outcomes} Outcomes • {layout.edges.length} Dependencies</p></div><div className="h-full pt-[49px]"><ReactFlowProvider><GraphCanvas nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onAutoLayout={autoLayout} revision={revision} /></ReactFlowProvider></div></section><aside className="bg-zinc-900/40 p-6"><p className="text-xs font-semibold uppercase tracking-[.2em] text-violet-300">AI Engineer</p><h2 className="mt-3 text-xl font-semibold">Curriculum changes</h2><p className="mt-2 text-sm text-zinc-400">Request a dependency-aware curriculum update and review it as a pull request.</p><div className={isJudgeMode ? 'mt-6 rounded-lg animate-pulse ring-2 ring-cyan-500/50' : 'mt-6'}>{isJudgeMode && <p className="px-2 pt-2 text-xs text-cyan-300">Step 1: Propose a change</p>}<textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="Move recursion before trees..." className="min-h-28 w-full resize-y rounded-xl border border-zinc-700 bg-zinc-950 p-3 text-sm outline-none focus:border-violet-400" /></div><button type="button" onClick={() => prompt.trim() && proposalMutation.mutate()} disabled={!prompt.trim() || proposalMutation.isPending} className="mt-3 w-full rounded-xl bg-violet-500 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{proposalMutation.isPending ? 'Analyzing dependencies...' : 'Propose Change'}</button>{pullRequest && <article className="mt-6 rounded-xl border border-zinc-700 bg-zinc-950 p-4"><div className="flex justify-between gap-3"><h3 className="text-sm font-semibold">Curriculum PR: {pullRequest.summary}</h3><span className={`rounded-full border px-2 py-1 text-xs ${riskStyles[pullRequest.risk_level]}`}>{pullRequest.risk_level} risk</span></div><ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-zinc-300">{pullRequest.affected_items.map((item) => <li key={item}>{item}</li>)}</ul><pre className="mt-4 max-h-64 overflow-x-auto whitespace-pre-wrap rounded-lg border border-zinc-800 bg-black p-3 text-xs text-zinc-300">{pullRequest.generated_diff}</pre><div className={isJudgeMode ? 'mt-4 rounded-lg animate-pulse ring-2 ring-cyan-500/50' : 'mt-4'}>{isJudgeMode && <p className="px-2 pt-2 text-xs text-cyan-300">Step 2: Approve the pull request</p>}<button type="button" onClick={() => approvalMutation.mutate()} disabled={approvalMutation.isPending} className="w-full rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-zinc-950 disabled:opacity-50">{approvalMutation.isPending ? 'Saving version...' : 'Approve & Apply'}</button></div></article>}{approvalMessage && <p className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">{approvalMessage}</p>}</aside></div>
}
