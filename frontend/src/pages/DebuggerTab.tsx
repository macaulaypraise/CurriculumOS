import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { fetchCourse, fetchProjectAssessments, fetchProjectVersions } from '../api/client'

export function DebuggerTab() {
  const { projectId, courseId } = useParams()
  const navigate = useNavigate()
  const numericCourseId = Number(courseId)
  const [isAnalyzed, setIsAnalyzed] = useState(false)

  const courseQuery = useQuery({
    queryKey: ['courseGraph', courseId],
    queryFn: () => fetchCourse(numericCourseId),
    enabled: Number.isInteger(numericCourseId) && numericCourseId > 0,
  })
  const versionsQuery = useQuery({
    queryKey: ['projects', projectId, 'versions'],
    queryFn: () => fetchProjectVersions(projectId as string),
    enabled: Boolean(projectId),
  })
  const assessmentsQuery = useQuery({
    queryKey: ['projects', projectId, 'assessments'],
    queryFn: () => fetchProjectAssessments(projectId as string),
    enabled: Boolean(projectId),
  })

  const analysis = useMemo(() => {
    const course = courseQuery.data
    if (!course) return null
    const assessments = assessmentsQuery.data ?? []
    const courseVersions = (versionsQuery.data ?? []).filter((version) => version.course_id === numericCourseId)
    const moduleWithCoverageGap = course.modules.find((module) => {
      const moduleAssessment = assessments.some((assessment) => assessment.rubric.scope === 'module' && assessment.rubric.target_id === module.id)
      const outcomeAssessment = assessments.some((assessment) => module.learning_outcomes.some((outcome) => outcome.id === assessment.learning_outcome_id))
      return !moduleAssessment && !outcomeAssessment
    }) ?? course.modules[0]
    const mostDenseModule = [...course.modules].sort((first, second) => (
      second.lessons.length + second.learning_outcomes.length - first.lessons.length - first.learning_outcomes.length
    ))[0]

    const insights = [
      moduleWithCoverageGap
        ? `Module '${moduleWithCoverageGap.title}' has ${moduleWithCoverageGap.lessons.length} lessons and ${moduleWithCoverageGap.learning_outcomes.length} learning outcomes, but no generated assessment coverage yet.`
        : 'Every module currently has at least one linked assessment.',
      mostDenseModule
        ? `Module '${mostDenseModule.title}' carries the highest content density (${mostDenseModule.lessons.length} lessons and ${mostDenseModule.learning_outcomes.length} outcomes); verify its assessment pacing before release.`
        : 'No module density insight is available yet.',
      courseVersions.length > 2
        ? `This course has ${courseVersions.length} saved versions, indicating active structural iteration. Review recent ordering changes before publishing.`
        : `This course has ${courseVersions.length} saved version${courseVersions.length === 1 ? '' : 's'}, providing a stable baseline for the next revision.`,
    ]

    return { course, courseVersions, moduleWithCoverageGap, insights }
  }, [assessmentsQuery.data, courseQuery.data, numericCourseId, versionsQuery.data])

  const runAnalysis = () => {
    setIsAnalyzed(true)
    toast.success('Course graph analysis ready')
  }
  const recommendation = analysis?.moduleWithCoverageGap
    ? `Add a lesson on prerequisite reinforcement to the ${analysis.moduleWithCoverageGap.title} module`
    : 'Add a lesson on curriculum reinforcement to the first module'
  const generatePr = () => {
    if (!analysis) return
    navigate(`/projects/${projectId}/courses/${courseId}/curriculum`, { state: { prompt: recommendation } })
  }

  if (courseQuery.isLoading || versionsQuery.isLoading || assessmentsQuery.isLoading) {
    return <section className="p-8 text-sm text-zinc-400">Analyzing course data...</section>
  }
  if (courseQuery.isError || versionsQuery.isError || assessmentsQuery.isError || !analysis) {
    return <section className="flex min-h-[480px] items-center justify-center p-8"><div className="rounded-2xl border border-rose-500/30 bg-rose-500/5 p-8 text-center"><p className="text-sm text-rose-300">Unable to load contextual learning insights.</p></div></section>
  }

  const focus = analysis.moduleWithCoverageGap
  return (
    <section className="mx-auto w-full max-w-5xl p-6 sm:p-10">
      <div className="border-b border-zinc-800 pb-7">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400">Learning Debugger</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-100">{analysis.course.title} health</h1>
        <p className="mt-2 text-sm text-zinc-400">Inspect assessment coverage and curriculum structure using the live course graph.</p>
      </div>

      <div className="mt-8 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-6 shadow-xl shadow-black/10">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-300">Coverage alert</p>
        <h2 className="mt-3 text-xl font-semibold text-zinc-100">{focus ? `${focus.title} needs assessment coverage` : 'No modules are available'}</h2>
        <p className="mt-2 text-sm leading-6 text-zinc-400">{focus ? `${focus.lessons.length} lessons and ${focus.learning_outcomes.length} learning outcomes are currently represented in this module.` : 'Add curriculum content to begin analysis.'}</p>
        <button type="button" onClick={runAnalysis} className="mt-6 rounded-lg bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-cyan-400">Analyze Course Graph</button>
      </div>

      {isAnalyzed && (
        <article className="mt-6 rounded-2xl border border-cyan-500/30 bg-cyan-500/5 p-6 shadow-xl shadow-cyan-950/20">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Contextual insights</p>
          <div className="mt-5 space-y-3">
            {analysis.insights.map((insight) => <p key={insight} className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4 text-sm leading-6 text-zinc-300">{insight}</p>)}
          </div>
          <div className="mt-6 rounded-xl border border-zinc-700 bg-zinc-950/70 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-300">Recommended curriculum action</p>
            <p className="mt-2 text-lg font-semibold text-zinc-100">{recommendation}</p>
          </div>
          <button type="button" onClick={generatePr} className="mt-6 rounded-lg bg-violet-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-400">Generate Curriculum PR</button>
        </article>
      )}
    </section>
  )
}
