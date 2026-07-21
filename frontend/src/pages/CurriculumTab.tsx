import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Background, BackgroundVariant, Controls, MarkerType, MiniMap, ReactFlow, ReactFlowProvider, useEdgesState, useNodesInitialized, useNodesState, useReactFlow, type Edge, type Node, type OnEdgesChange, type OnNodeDrag, type OnNodesChange } from 'reactflow'
import { useLocation, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import 'reactflow/dist/style.css'
import { AppContext } from '../App'
import { approveChange, fetchCourse, generateAssessment, proposeChange } from '../api/client'
import { LessonNode } from '../components/graph/LessonNode'
import { ModuleNode } from '../components/graph/ModuleNode'
import { OutcomeNode } from '../components/graph/OutcomeNode'
import { getLayoutedElements } from '../utils/graphLayout'

const nodeTypes = { module: ModuleNode, lesson: LessonNode, outcome: OutcomeNode }
const inactiveEdgeStyle = { stroke: '#52525b', strokeWidth: 2, opacity: 0.4 }

type GraphCanvasProps = {
  nodes: Node[]
  edges: Edge[]
  onNodesChange: OnNodesChange
  onEdgesChange: OnEdgesChange
  onNodeDragStop: OnNodeDrag
  onAutoLayout: () => void
  revision: number
}

function GraphCanvas({ nodes, edges, onNodesChange, onEdgesChange, onNodeDragStop, onAutoLayout, revision }: GraphCanvasProps) {
  const { fitView } = useReactFlow()
  const initialized = useNodesInitialized()

  useEffect(() => {
    if (!initialized || !nodes.length) return
    const frame = requestAnimationFrame(() => fitView({ padding: 0.25, duration: 800 }))
    return () => cancelAnimationFrame(frame)
  }, [fitView, initialized, nodes.length, revision])

  return (
    <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onNodeDragStop={onNodeDragStop} fitView className="bg-zinc-950">
      <Background variant={BackgroundVariant.Dots} color="#27272a" gap={20} size={1} />
      <Controls className="!border-zinc-700 !bg-zinc-900 !fill-zinc-300" />
      <MiniMap className="!border !border-zinc-700 !bg-zinc-900" nodeColor={(node) => node.type === 'module' ? '#06b6d4' : '#52525b'} maskColor="rgba(9,9,11,.72)" />
      <div className="absolute bottom-5 right-5 z-10 flex overflow-hidden rounded-lg border border-zinc-700 bg-zinc-900">
        <button type="button" onClick={() => fitView({ padding: 0.25, duration: 800 })} className="border-r border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800">Fit View</button>
        <button type="button" onClick={onAutoLayout} className="px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800">Auto Layout</button>
      </div>
    </ReactFlow>
  )
}

export function CurriculumTab() {
  const { projectId, courseId } = useParams()
  const location = useLocation() as { state?: { prompt?: string } }
  const appContext = useContext(AppContext)
  const isJudgeMode = appContext?.isJudgeMode ?? false
  const numericProjectId = Number(projectId)
  const numericCourseId = Number(courseId)
  const validProject = Boolean(projectId && numericProjectId > 0)
  const validCourse = Boolean(courseId && numericCourseId > 0)
  const [prompt, setPrompt] = useState('')
  const [revision, setRevision] = useState(0)
  const [selectedNode, setSelectedNode] = useState<any>(null)
  const [editor, setEditor] = useState<{ title: string; description: string } | null>(null)
  const loadedCourse = useRef<number | null>(null)
  const queryClient = useQueryClient()

  const graphQuery = useQuery({ queryKey: ['courseGraph', courseId], queryFn: () => fetchCourse(numericCourseId), enabled: validCourse })

  useEffect(() => { if (location.state?.prompt) setPrompt(location.state.prompt) }, [location.state?.prompt])

  const layout = useMemo(() => {
    if (!graphQuery.data) return { nodes: [] as Node[], edges: [] as Edge[] }
    const nodes: Node[] = []
    const edges: Edge[] = []
    const sortedModules = [...graphQuery.data.modules].sort((a, b) => a.position - b.position)
    let prevModuleId: string | null = null

    sortedModules.forEach((module) => {
      const moduleId = `module-${module.id}`
      nodes.push({
        id: moduleId,
        type: 'module',
        draggable: true,
        position: { x: 0, y: 0 },
        data: {
          title: module.title,
          dbId: module.id,
          description: module.description,
          lessonCount: module.lessons.length,
          outcomeCount: module.learning_outcomes.length,
          status: 'current',
          onClick: () => setSelectedNode({
            type: 'module',
            id: moduleId,
            dbId: module.id,
            title: module.title,
            description: module.description,
          }),
        },
      })

      if (prevModuleId) {
        edges.push({
          id: `seq-${prevModuleId}-${moduleId}`,
          source: prevModuleId,
          target: moduleId,
          hidden: true,
        })
      }
      prevModuleId = moduleId

      let parent = moduleId
      module.lessons.forEach((lesson) => {
        const id = `lesson-${lesson.id}`
        nodes.push({
          id,
          type: 'lesson',
          draggable: false,
          position: { x: 0, y: 0 },
          data: {
            title: lesson.title,
            dbId: lesson.id,
            description: lesson.description,
            onClick: () => setSelectedNode({
              type: 'lesson',
              id,
              dbId: lesson.id,
              title: lesson.title,
              description: lesson.description,
            }),
          },
        })
        edges.push({
          id: `${parent}-${id}`,
          source: parent,
          target: id,
          animated: true,
          style: inactiveEdgeStyle,
          markerEnd: { type: MarkerType.ArrowClosed, color: '#52525b' },
        })
        parent = id
      })

      module.learning_outcomes.forEach((outcome) => {
        const id = `outcome-${outcome.id}`
        nodes.push({
          id,
          type: 'outcome',
          draggable: false,
          position: { x: 0, y: 0 },
          data: {
            statement: outcome.statement,
            dbId: outcome.id,
            onClick: () => setSelectedNode({
              type: 'outcome',
              id,
              dbId: outcome.id,
              title: outcome.statement,
              statement: outcome.statement,
            }),
          },
        })
        edges.push({
          id: `${parent}-${id}`,
          source: parent,
          target: id,
          animated: true,
          style: inactiveEdgeStyle,
          markerEnd: { type: MarkerType.ArrowClosed, color: '#52525b' },
        })
      })
    })

    return getLayoutedElements(nodes, edges)
  }, [graphQuery.data])

  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])

  useEffect(() => {
    setNodes(layout.nodes)
    setEdges(layout.edges)
    setRevision((value) => value + 1)
    if (graphQuery.data?.id && loadedCourse.current !== graphQuery.data.id) {
      loadedCourse.current = graphQuery.data.id
      toast.success('Curriculum Graph loaded')
    }
  }, [graphQuery.data?.id, layout, setEdges, setNodes])

  const invalidateCurriculumData = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['courseGraph', courseId] }),
      queryClient.invalidateQueries({ queryKey: ['projects', projectId, 'versions'] }),
      queryClient.invalidateQueries({ queryKey: ['projects', projectId, 'activity'] })
    ])
  }, [courseId, projectId, queryClient])

  const autoLayout = useCallback(() => {
    const next = getLayoutedElements(nodes, edges)
    setNodes(next.nodes)
    setEdges(next.edges)
    setRevision((value) => value + 1)
    toast.success('Graph layout updated')
  }, [edges, nodes, setEdges, setNodes])

  const proposalMutation = useMutation({
    mutationFn: (actionPrompt: string) => proposeChange(numericCourseId, actionPrompt),
    onMutate: () => toast.info('Generating Proposal...'),
    onSuccess: (proposal, actionPrompt) => {
      if (!appContext) {
        toast.error('Unable to add the proposal to the changes queue.')
        return
      }
      appContext.addPendingChange({ id: crypto.randomUUID(), projectId: numericProjectId, courseId: numericCourseId, prompt: actionPrompt, proposal, createdAt: new Date().toISOString() })
      setPrompt('')
      localStorage.setItem('curriculumos_pr_generated', 'true')
      window.dispatchEvent(new Event('curriculumos-progress'))
      toast.success('PR added to the Changes Queue')
    },
    onError: () => toast.error('Unable to generate a curriculum proposal.')
  })

  const reorderMutation = useMutation({
    mutationFn: (actionPrompt: string) => approveChange(numericProjectId, actionPrompt, numericCourseId),
    onSuccess: async () => {
      await invalidateCurriculumData()
      toast.success('Module reordered and saved as a new version')
    },
    onError: (error: any) => toast.error(error?.response?.data?.detail ?? 'Unable to save the module order.')
  })

  const handleModuleDragStop: OnNodeDrag = (_event, droppedNode) => {
    if (droppedNode.type !== 'module' || reorderMutation.isPending) return
    const orderedModules = nodes
      .filter((node) => node.type === 'module')
      .map((node) => node.id === droppedNode.id ? { ...node, position: droppedNode.position } : node)
      .sort((first, second) => first.position.x - second.position.x)
    const newPosition = orderedModules.findIndex((node) => node.id === droppedNode.id) + 1
    const title = String(droppedNode.data.title ?? '')
    if (!title || newPosition < 1) return
    reorderMutation.mutate(`Move ${title} to position ${newPosition}`)
  }

  const handleGraphMutation = (actionPrompt: string) => {
    setPrompt(actionPrompt)
    setSelectedNode(null)
    window.setTimeout(() => proposalMutation.mutate(actionPrompt), 100)
  }

  const saveNodeEdit = () => {
    if (!selectedNode || !editor?.title.trim()) return
    const current = selectedNode.title ?? selectedNode.statement
    const kind = selectedNode.type === 'outcome' ? 'outcome' : selectedNode.type
    handleGraphMutation(`Edit ${kind} ${current} to ${editor.title.trim()}`)
    setEditor(null)
  }

  const handleGenerateAssessment = async () => {
    if (!selectedNode?.dbId) return
    if (selectedNode.type !== 'module' && selectedNode.type !== 'outcome') {
      toast.error('Assessments can be generated for modules or learning outcomes.')
      return
    }
    const scope = selectedNode.type === 'module' ? 'module' : 'outcome'
    const title = selectedNode.title ?? selectedNode.statement ?? 'selected curriculum item'
    toast.info(`Generating assessment for ${title}...`)
    setSelectedNode(null)
    try {
      await generateAssessment(numericProjectId, { scope, target_id: selectedNode.dbId, outcome_text: title })
      await queryClient.invalidateQueries({ queryKey: ['projects', projectId, 'assessments'] })
      toast.success('Assessment created! Check the Assessments tab.')
    } catch {
      toast.error('Failed to generate assessment')
    }
  }

  if (!validProject || !validCourse || graphQuery.isError) return <section className="flex min-h-[520px] items-center justify-center p-8"><div className="rounded-2xl border border-rose-500/30 bg-rose-500/5 p-8 text-center"><p className="text-sm text-rose-300">Failed to load curriculum graph</p></div></section>
  if (graphQuery.isLoading || !graphQuery.data) return <section className="p-8 text-sm text-zinc-400">Loading curriculum graph...</section>

  const modules = graphQuery.data.modules.length
  const lessons = graphQuery.data.modules.reduce((sum, module) => sum + module.lessons.length, 0)
  const outcomes = graphQuery.data.modules.reduce((sum, module) => sum + module.learning_outcomes.length, 0)

  return (
    <div className="relative grid h-full min-h-[640px] grid-cols-1 xl:grid-cols-[minmax(0,1fr)_380px]">
      <section className="relative min-h-[620px] border-b border-zinc-800 xl:border-b-0 xl:border-r">
        <div className="absolute inset-x-0 top-0 z-10 flex items-center gap-3 border-b border-zinc-800 bg-zinc-950/90 px-6 py-3"><h1 className="text-sm font-semibold">Curriculum Graph</h1><p className="text-xs text-zinc-400">{modules} Modules ? {lessons} Lessons ? {outcomes} Outcomes ? {layout.edges.length} Relationships</p></div>
        <div className="h-full pt-[49px]"><ReactFlowProvider><GraphCanvas nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onNodeDragStop={handleModuleDragStop} onAutoLayout={autoLayout} revision={revision} /></ReactFlowProvider></div>
      </section>

      <aside className="overflow-y-auto bg-zinc-900/40 p-6">
        <p className="text-xs font-semibold uppercase tracking-[.2em] text-violet-300">AI Engineer</p><h2 className="mt-3 text-xl font-semibold">Curriculum changes</h2><p className="mt-2 text-sm text-zinc-400">Request a dependency-aware curriculum update. Proposals are added to the Changes Queue for review.</p>
        <div className={isJudgeMode ? 'mt-6 rounded-lg animate-pulse ring-2 ring-cyan-500/50' : 'mt-6'}>
          {isJudgeMode && <p className="px-2 pt-2 text-xs text-cyan-300">Step 1: Propose a change</p>}
          <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="Move recursion before trees..." className="min-h-28 w-full resize-y rounded-xl border border-zinc-700 bg-zinc-950 p-3 text-sm outline-none focus:border-violet-400" />
        </div>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <button type="button" onClick={() => setPrompt('Generate a comprehensive assessment for the selected module')} className="rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-2 text-xs text-zinc-300 transition hover:border-cyan-500 hover:text-cyan-300">Generate Assessment</button>
          <button type="button" onClick={() => setPrompt('Add a lesson on [topic] to the [module] module')} className="rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-2 text-xs text-zinc-300 transition hover:border-cyan-500 hover:text-cyan-300">Add Lesson</button>
          <button type="button" onClick={() => setPrompt('Merge [Module A] and [Module B] into [New Module]')} className="rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-2 text-xs text-zinc-300 transition hover:border-cyan-500 hover:text-cyan-300">Merge Modules</button>
          <button type="button" onClick={() => setPrompt('Add module New Module')} className="rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-2 text-xs text-zinc-300 transition hover:border-cyan-500 hover:text-cyan-300">Add New Module</button>
        </div>
        <button type="button" onClick={() => prompt.trim() && proposalMutation.mutate(prompt.trim())} disabled={!prompt.trim() || proposalMutation.isPending} className="mt-3 w-full rounded-xl bg-violet-500 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{proposalMutation.isPending ? 'Analyzing dependencies...' : 'Propose Change'}</button>
        <p className="mt-4 text-center text-xs text-zinc-500">Review and apply generated pull requests in the Changes tab.</p>
      </aside>

      {selectedNode && <div className="absolute right-0 top-0 z-50 h-full w-80 overflow-y-auto border-l border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between"><h3 className="truncate pr-2 text-lg font-bold text-white">{selectedNode.title || selectedNode.statement}</h3><button type="button" onClick={() => setSelectedNode(null)} className="text-xl text-zinc-500 hover:text-white">?</button></div>
        <p className="mb-6 text-sm text-zinc-400">{selectedNode.description || 'No description available.'}</p><div className="space-y-3"><p className="text-xs font-semibold uppercase text-zinc-500">Quick Actions</p>
          <button type="button" onClick={() => setEditor({ title: selectedNode.title ?? selectedNode.statement ?? '', description: selectedNode.description ?? '' })} className="w-full rounded-lg border border-zinc-600 bg-zinc-800 px-4 py-2 text-left text-sm text-zinc-200 hover:bg-zinc-700">Edit</button>
          {selectedNode.type === 'module' && <button type="button" onClick={() => handleGraphMutation(`Add outcome New measurable outcome to ${selectedNode.title} module`)} className="w-full rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-left text-sm text-amber-200 hover:bg-amber-500/20">Add Outcome</button>}
          {selectedNode.type === 'lesson' && <button type="button" onClick={() => { const first = window.prompt('First new lesson title'); const second = window.prompt('Second new lesson title'); if (first?.trim() && second?.trim()) handleGraphMutation(`Split lesson ${selectedNode.title} into ${first.trim()} and ${second.trim()}`) }} className="w-full rounded-lg border border-fuchsia-500/30 bg-fuchsia-500/10 px-4 py-2 text-left text-sm text-fuchsia-200 hover:bg-fuchsia-500/20">Split Lesson</button>}
          {selectedNode.type === 'lesson' && <button type="button" onClick={() => { const other = window.prompt('Merge with which lesson?'); if (other?.trim()) handleGraphMutation(`Merge lessons ${selectedNode.title} and ${other.trim()}`) }} className="w-full rounded-lg border border-sky-500/30 bg-sky-500/10 px-4 py-2 text-left text-sm text-sky-200 hover:bg-sky-500/20">Merge Lesson</button>}
          <button type="button" onClick={handleGenerateAssessment} className="w-full rounded-lg border border-violet-500/30 bg-violet-600/20 px-4 py-2 text-left text-sm text-violet-300 hover:bg-violet-600/30">Generate Assessment</button>
          <button type="button" onClick={() => handleGraphMutation(`Add a new lesson to the ${selectedNode.title} module`)} className="w-full rounded-lg border border-emerald-500/30 bg-emerald-600/20 px-4 py-2 text-left text-sm text-emerald-300 hover:bg-emerald-600/30">Add Lesson</button>
          {selectedNode.type === 'module' && <button type="button" onClick={() => { const otherModule = window.prompt('Merge with which module?'); if (otherModule?.trim()) handleGraphMutation(`Merge ${selectedNode.title} and ${otherModule.trim()}`) }} className="w-full rounded-lg border border-sky-500/30 bg-sky-600/20 px-4 py-2 text-left text-sm text-sky-300 hover:bg-sky-600/30">Merge with...</button>}
          <button type="button" onClick={() => handleGraphMutation(`Remove ${selectedNode.type} ${selectedNode.title ?? selectedNode.statement}`)} className="w-full rounded-lg border border-rose-500/30 bg-rose-600/20 px-4 py-2 text-left text-sm text-rose-300 hover:bg-rose-600/30">Remove {selectedNode.type}</button>
        </div>
        {editor && <div className="mt-5 rounded-xl border border-cyan-500/30 bg-zinc-950 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-cyan-300">Edit {selectedNode.type}</p><input value={editor.title} onChange={(event) => setEditor({ ...editor, title: event.target.value })} className="mt-3 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-cyan-500" />{selectedNode.type !== 'outcome' && <textarea value={editor.description} onChange={(event) => setEditor({ ...editor, description: event.target.value })} placeholder="Description" className="mt-3 min-h-20 w-full rounded-lg border border-zinc-700 bg-zinc-900 p-3 text-sm text-zinc-100 outline-none focus:border-cyan-500" />}<div className="mt-3 flex gap-2"><button type="button" onClick={saveNodeEdit} className="rounded-lg bg-cyan-500 px-3 py-2 text-xs font-semibold text-zinc-950">Save as PR</button><button type="button" onClick={() => setEditor(null)} className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-300">Cancel</button></div></div>}
      </div>}
    </div>
  )
}
