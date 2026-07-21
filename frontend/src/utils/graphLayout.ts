import dagre from 'dagre'
import { Position, type Edge, type Node } from 'reactflow'

const dimensionsByType: Record<string, { width: number; height: number }> = {
  module: { width: 240, height: 96 },
  lesson: { width: 192, height: 40 },
  outcome: { width: 190, height: 24 },
}
const defaultDimensions = { width: 190, height: 40 }

function dimensionsFor(node: Node): { width: number; height: number } {
  const fallback = dimensionsByType[node.type ?? ''] ?? defaultDimensions
  return {
    width: node.measured?.width ?? fallback.width,
    height: node.measured?.height ?? fallback.height,
  }
}

function positionFromCenter(node: Node, x: number, y: number) {
  const { width, height } = dimensionsFor(node)
  return { x: x - width / 2, y: y - height / 2 }
}

function getHorizontalCurriculumLayout(nodes: Node[], edges: Edge[]): { nodes: Node[]; edges: Edge[] } {
  const nodeById = new Map(nodes.map((node) => [node.id, node]))
  const modules = nodes.filter((node) => node.type === 'module')
  const sequenceEdges = edges.filter((edge) => edge.hidden)
  const nextModuleById = new Map(sequenceEdges.map((edge) => [edge.source, edge.target]))
  const sequenceTargets = new Set(sequenceEdges.map((edge) => edge.target))
  const moduleIds = new Set(modules.map((node) => node.id))
  const orderedModules: Node[] = []
  const seenModuleIds = new Set<string>()
  let moduleId = modules.find((node) => !sequenceTargets.has(node.id))?.id

  while (moduleId && moduleIds.has(moduleId) && !seenModuleIds.has(moduleId)) {
    const module = nodeById.get(moduleId)
    if (!module) break
    orderedModules.push(module)
    seenModuleIds.add(moduleId)
    moduleId = nextModuleById.get(moduleId)
  }
  modules.forEach((module) => {
    if (!seenModuleIds.has(module.id)) orderedModules.push(module)
  })

  const childEdges = edges.filter((edge) => !edge.hidden)
  const childrenBySource = new Map<string, string[]>()
  childEdges.forEach((edge) => {
    childrenBySource.set(edge.source, [...(childrenBySource.get(edge.source) ?? []), edge.target])
  })

  const layoutById = new Map<string, { x: number; y: number }>()
  const columnGap = 460
  const outcomeGap = 230
  const moduleCenterY = 80
  const itemGap = 26

  orderedModules.forEach((module, moduleIndex) => {
    const moduleCenterX = moduleIndex * columnGap
    layoutById.set(module.id, positionFromCenter(module, moduleCenterX, moduleCenterY))

    const descendants: Node[] = []
    const visited = new Set<string>([module.id])
    const queue = [...(childrenBySource.get(module.id) ?? [])]
    while (queue.length) {
      const childId = queue.shift()
      if (!childId || visited.has(childId)) continue
      visited.add(childId)
      const child = nodeById.get(childId)
      if (!child || child.type === 'module') continue
      descendants.push(child)
      queue.push(...(childrenBySource.get(childId) ?? []))
    }

    const lessons = descendants.filter((node) => node.type === 'lesson')
    const outcomes = descendants.filter((node) => node.type === 'outcome')
    let nextCenterY = moduleCenterY + dimensionsFor(module).height / 2 + itemGap

    lessons.forEach((lesson) => {
      const { height } = dimensionsFor(lesson)
      nextCenterY += height / 2
      layoutById.set(lesson.id, positionFromCenter(lesson, moduleCenterX, nextCenterY))
      nextCenterY += height / 2 + itemGap
    })

    if (outcomes.length) {
      const outcomeRowY = nextCenterY + Math.max(...outcomes.map((outcome) => dimensionsFor(outcome).height)) / 2
      outcomes.forEach((outcome, index) => {
        const offset = (index - (outcomes.length - 1) / 2) * outcomeGap
        layoutById.set(outcome.id, positionFromCenter(outcome, moduleCenterX + offset, outcomeRowY))
      })
    }
  })

  return {
    nodes: nodes.map((node) => ({
      ...node,
      sourcePosition: Position.Bottom,
      targetPosition: Position.Top,
      position: layoutById.get(node.id) ?? node.position,
    })),
    edges,
  }
}

export function getLayoutedElements(nodes: Node[], edges: Edge[]): { nodes: Node[]; edges: Edge[] } {
  if (nodes.some((node) => node.type === 'module') && edges.some((edge) => edge.hidden)) {
    return getHorizontalCurriculumLayout(nodes, edges)
  }

  const graph = new dagre.graphlib.Graph()
  graph.setDefaultEdgeLabel(() => ({}))
  graph.setGraph({ rankdir: 'TB', nodesep: 80, ranksep: 100, marginx: 64, marginy: 64 })

  nodes.forEach((node) => {
    const { width, height } = dimensionsFor(node)
    graph.setNode(node.id, { width, height })
  })
  edges.forEach((edge) => graph.setEdge(edge.source, edge.target))
  dagre.layout(graph)

  return {
    nodes: nodes.map((node) => {
      const layoutNode = graph.node(node.id)
      const { width, height } = dimensionsFor(node)
      return {
        ...node,
        sourcePosition: Position.Bottom,
        targetPosition: Position.Top,
        position: { x: layoutNode.x - width / 2, y: layoutNode.y - height / 2 },
      }
    }),
    edges,
  }
}
