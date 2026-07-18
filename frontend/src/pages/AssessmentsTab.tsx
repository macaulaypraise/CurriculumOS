import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import {
  fetchProjectAssessments,
  fetchProjectGraph,
  generateAssessment,
  type Assessment,
} from '../api/client'

export function AssessmentsTab() {
  const { projectId } = useParams()
  const isValidProjectId = Boolean(projectId && Number.isInteger(Number(projectId)) && Number(projectId) > 0)
  const queryClient = useQueryClient()
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<number | null>(null)
  const [selectedOutcomeId, setSelectedOutcomeId] = useState('')
  const assessmentsQuery = useQuery({
    queryKey: ['projects', projectId, 'assessments'],
    queryFn: () => fetchProjectAssessments(projectId as string),
    enabled: isValidProjectId,
  })
  const graphQuery = useQuery({
    queryKey: ['projects', projectId, 'graph'],
    queryFn: () => fetchProjectGraph(projectId as string),
    enabled: isValidProjectId,
  })
  const outcomes = useMemo(
    () => graphQuery.data?.modules.flatMap((module) =>
      module.learning_outcomes.map((outcome) => ({ ...outcome, moduleTitle: module.title })),
    ) ?? [],
    [graphQuery.data],
  )

  const generateMutation = useMutation({
    mutationFn: () => {
      const outcome = outcomes.find((item) => item.id === Number(selectedOutcomeId))
      if (!outcome || !projectId) throw new Error('Select a learning outcome first.')
      return generateAssessment(projectId, {
        learning_outcome_id: outcome.id,
        outcome_text: outcome.statement,
      })
    },
    onSuccess: async (assessment) => {
      setSelectedAssessmentId(assessment.id)
      await queryClient.invalidateQueries({ queryKey: ['projects', projectId, 'assessments'] })
    },
  })

  useEffect(() => {
    if (assessmentsQuery.data?.length && selectedAssessmentId === null) {
      setSelectedAssessmentId(assessmentsQuery.data[0].id)
    }
  }, [assessmentsQuery.data, selectedAssessmentId])

  const assessments = assessmentsQuery.data ?? []
  const selectedAssessment: Assessment | undefined = assessments.find((item) => item.id === selectedAssessmentId)

  if (!isValidProjectId || assessmentsQuery.isError || graphQuery.isError) {
    return (
      <section className="flex min-h-[480px] items-center justify-center p-8">
        <div className="w-full max-w-xl rounded-2xl border border-rose-500/30 bg-rose-500/5 p-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-300">Assessments unavailable</p>
          <h1 className="mt-3 text-xl font-semibold text-zinc-100">Failed to load assessments</h1>
          <p className="mt-2 text-sm text-zinc-400">Check that the API is running and the project has been seeded.</p>
        </div>
      </section>
    )
  }

  if (assessmentsQuery.isLoading || graphQuery.isLoading) {
    return <section className="p-8 text-sm text-zinc-400">Loading assessments...</section>
  }

  return (
    <div className="grid h-full min-h-[640px] grid-cols-1 lg:grid-cols-[310px_minmax(0,1fr)]">
      <aside className="border-b border-zinc-800 bg-zinc-900/40 p-4 lg:border-b-0 lg:border-r">
        <div className="px-2 pb-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400">Assessment compiler</p>
          <h1 className="mt-2 text-lg font-semibold text-zinc-100">Assessments</h1>
        </div>

        <div className="space-y-2">
          {assessments.map((assessment) => (
            <button
              key={assessment.id}
              type="button"
              onClick={() => setSelectedAssessmentId(assessment.id)}
              className={`w-full rounded-xl border p-3 text-left transition-colors ${
                selectedAssessmentId === assessment.id
                  ? 'border-cyan-500/40 bg-cyan-500/10'
                  : 'border-zinc-800 bg-zinc-950/40 hover:border-zinc-700 hover:bg-zinc-900'
              }`}
            >
              <p className="text-sm font-medium text-zinc-100">{assessment.title}</p>
              <p className="mt-1 text-xs text-zinc-500">{assessment.questions.length} questions</p>
            </button>
          ))}
          {assessments.length === 0 && <p className="rounded-xl border border-dashed border-zinc-700 p-4 text-sm text-zinc-400">No assessments yet.</p>}
        </div>

        <div className="mt-6 rounded-xl border border-zinc-700 bg-zinc-950 p-4">
          <p className="text-sm font-semibold text-zinc-100">Generate New</p>
          <p className="mt-1 text-xs leading-5 text-zinc-400">Build an assessment directly from a learning outcome.</p>
          <select
            value={selectedOutcomeId}
            onChange={(event) => setSelectedOutcomeId(event.target.value)}
            className="mt-3 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 outline-none focus:border-cyan-500"
          >
            <option value="">Select a learning outcome</option>
            {outcomes.map((outcome) => (
              <option key={outcome.id} value={outcome.id}>{outcome.moduleTitle}: {outcome.statement}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => generateMutation.mutate()}
            disabled={!selectedOutcomeId || generateMutation.isPending}
            className="mt-3 w-full rounded-lg bg-cyan-500 px-3 py-2 text-sm font-semibold text-zinc-950 transition-colors hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {generateMutation.isPending ? 'Generating assessment...' : 'Generate Assessment'}
          </button>
          {generateMutation.isError && <p className="mt-2 text-xs text-rose-300">Unable to generate this assessment. Try again.</p>}
        </div>
      </aside>

      <section className="min-w-0 bg-zinc-950 p-6 lg:p-8">
        {generateMutation.isPending ? (
          <div className="animate-pulse space-y-5">
            <div className="h-7 w-1/3 rounded bg-zinc-800" />
            <div className="h-40 rounded-xl border border-zinc-800 bg-zinc-900" />
            <div className="h-40 rounded-xl border border-zinc-800 bg-zinc-900" />
          </div>
        ) : selectedAssessment ? (
          <div className="mx-auto max-w-5xl">
            <div className="border-b border-zinc-800 pb-6">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400">Generated assessment</p>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-zinc-100">{selectedAssessment.title}</h2>
              <p className="mt-2 text-sm text-zinc-400">{selectedAssessment.questions.length} questions • {selectedAssessment.rubric.total_points ?? '—'} total points</p>
            </div>

            <div className="mt-8 grid gap-8 xl:grid-cols-[minmax(0,1.25fr)_minmax(280px,0.75fr)]">
              <div>
                <h3 className="text-sm font-semibold text-zinc-100">Questions</h3>
                <div className="mt-4 space-y-4">
                  {selectedAssessment.questions.map((question, index) => (
                    <article key={`${question.question}-${index}`} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
                      <div className="flex items-start justify-between gap-4">
                        <h4 className="text-sm font-semibold text-zinc-100">{index + 1}. {question.question}</h4>
                        {question.points && <span className="shrink-0 rounded-full bg-zinc-800 px-2 py-1 text-xs text-zinc-300">{question.points} pts</span>}
                      </div>
                      {question.prompt && <p className="mt-3 text-sm leading-6 text-zinc-300">{question.prompt}</p>}
                      {question.parts && <ol className="mt-3 list-[lower-alpha] space-y-2 pl-5 text-sm text-zinc-400">{question.parts.map((part) => <li key={part}>{part}</li>)}</ol>}
                    </article>
                  ))}
                </div>
              </div>

              <aside>
                <h3 className="text-sm font-semibold text-zinc-100">Grading Rubric</h3>
                <div className="mt-4 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/50">
                  {selectedAssessment.rubric.criteria?.map((criterion) => (
                    <div key={criterion.criterion} className="border-b border-zinc-800 p-4 last:border-b-0">
                      <div className="flex items-center justify-between gap-3"><p className="text-sm font-medium text-zinc-200">{criterion.criterion}</p><span className="text-xs text-cyan-300">{criterion.points} pts</span></div>
                      <p className="mt-2 text-xs leading-5 text-zinc-400">{criterion.description}</p>
                    </div>
                  ))}
                </div>
              </aside>
            </div>
          </div>
        ) : (
          <div className="flex min-h-[420px] items-center justify-center rounded-2xl border border-dashed border-zinc-700 bg-zinc-900/20 p-8 text-center">
            <div><h2 className="text-lg font-semibold text-zinc-200">Select an assessment</h2><p className="mt-2 text-sm text-zinc-400">Choose an existing assessment or generate one from a learning outcome.</p></div>
          </div>
        )}
      </section>
    </div>
  )
}
