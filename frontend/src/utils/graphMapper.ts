import type { Edge, Node } from 'reactflow'

import type { Course } from '../api/client'

const MODULE_WIDTH = 640
const MODULE_GAP = 72
const CHILD_WIDTH = 260
const CHILD_HEIGHT = 86
const CHILD_GAP = 18

const moduleStyle = {
  background: '#1e293b',
  border: '1px solid #38bdf8',
  borderRadius: 16,
  color: '#e2e8f0',
  padding: 16,
}

const lessonStyle = {
  background: '#134e4a',
  border: '1px solid #2dd4bf',
  borderRadius: 10,
  color: '#ccfbf1',
  fontSize: 12,
  padding: 10,
  width: CHILD_WIDTH,
}

const outcomeStyle = {
  background: '#4c1d95',
  border: '1px solid #c084fc',
  borderRadius: 10,
  color: '#f3e8ff',
  fontSize: 12,
  padding: 10,
  width: CHILD_WIDTH,
}

export function mapCourseToFlow(course: Course): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = []
  const edges: Edge[] = []

  course.modules.forEach((module, moduleIndex) => {
    const moduleId = `module-${moduleIndex}`
    const childCount = Math.max(module.lessons.length, module.learning_outcomes.length, 1)
    const moduleHeight = Math.max(220, childCount * (CHILD_HEIGHT + CHILD_GAP) + 80)

    nodes.push({
      id: moduleId,
      type: 'group',
      data: { label: module.title },
      position: { x: moduleIndex * (MODULE_WIDTH + MODULE_GAP), y: 80 },
      style: { ...moduleStyle, width: MODULE_WIDTH, height: moduleHeight },
    })

    module.lessons.forEach((lesson, lessonIndex) => {
      const lessonId = `${moduleId}-lesson-${lessonIndex}`
      nodes.push({
        id: lessonId,
        parentNode: moduleId,
        extent: 'parent',
        data: { label: lesson.title },
        position: { x: 24, y: 58 + lessonIndex * (CHILD_HEIGHT + CHILD_GAP) },
        style: lessonStyle,
      })
      edges.push({
        id: `${moduleId}-to-${lessonId}`,
        source: moduleId,
        target: lessonId,
        animated: true,
        style: { stroke: '#2dd4bf' },
      })
    })

    module.learning_outcomes.forEach((outcome, outcomeIndex) => {
      const outcomeId = `${moduleId}-outcome-${outcomeIndex}`
      nodes.push({
        id: outcomeId,
        parentNode: moduleId,
        extent: 'parent',
        data: { label: outcome.statement },
        position: { x: 344, y: 58 + outcomeIndex * (CHILD_HEIGHT + CHILD_GAP) },
        style: outcomeStyle,
      })
      edges.push({
        id: `${moduleId}-to-${outcomeId}`,
        source: moduleId,
        target: outcomeId,
        animated: true,
        style: { stroke: '#c084fc' },
      })
    })
  })

  return { nodes, edges }
}
