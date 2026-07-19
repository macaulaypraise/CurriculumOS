import dagre from 'dagre'
import { Position, type Edge, type Node } from 'reactflow'

const dimensionsByType: Record<string, { width: number; height: number }> = {
  module: { width: 240, height: 96 },
  lesson: { width: 192, height: 40 },
  outcome: { width: 190, height: 24 },
}
const defaultDimensions = { width: 190, height: 40 }

export function getLayoutedElements(nodes: Node[], edges: Edge[]): { nodes: Node[]; edges: Edge[] } {
  const graph = new dagre.graphlib.Graph()
  graph.setDefaultEdgeLabel(() => ({}))
  graph.setGraph({ rankdir: 'TB', nodesep: 80, ranksep: 100, marginx: 64, marginy: 64 })

  nodes.forEach((node) => {
    const dimensions = dimensionsByType[node.type ?? ''] ?? defaultDimensions
    graph.setNode(node.id, { width: node.measured?.width ?? dimensions.width, height: node.measured?.height ?? dimensions.height })
  })
  edges.forEach((edge) => graph.setEdge(edge.source, edge.target))
  dagre.layout(graph)

  return {
    nodes: nodes.map((node) => {
      const layoutNode = graph.node(node.id)
      const dimensions = dimensionsByType[node.type ?? ''] ?? defaultDimensions
      const width = node.measured?.width ?? dimensions.width
      const height = node.measured?.height ?? dimensions.height
      return { ...node, sourcePosition: Position.Bottom, targetPosition: Position.Top, position: { x: layoutNode.x - width / 2, y: layoutNode.y - height / 2 } }
    }),
    edges,
  }
}
