import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ActionMenu } from '../components/ActionMenu'
import { RenameModal } from '../components/RenameModal'
import { archiveAssessment, fetchCourse, fetchProjectAssessments, generateAssessment, renameAssessment, type Assessment } from '../api/client'

function scopeLabel(assessment: Assessment) {
  return assessment.rubric.scope ?? (assessment.learning_outcome_id ? 'outcome' : 'module')
}

function targetLabel(assessment: Assessment) {
  return assessment.rubric.target_title ?? 'Legacy curriculum target'
}

export function AssessmentsTab() {
  const { projectId, courseId } = useParams()
  const numericProjectId = Number(projectId)
  const validProjectId = Boolean(projectId && Number.isInteger(numericProjectId) && numericProjectId > 0)

  const queryClient = useQueryClient()
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<number | null>(null)
  const [selectedModuleId, setSelectedModuleId] = useState('')
  const [selectedOutcomeId, setSelectedOutcomeId] = useState('')
  const [scope, setScope] = useState<'outcome' | 'module' | 'course'>('outcome')
  const [renaming, setRenaming] = useState<Assessment | null>(null)

  const assessmentsQuery = useQuery({ queryKey: ['projects', projectId, 'assessments'], queryFn: () => fetchProjectAssessments(projectId as string), enabled: validProjectId })
  const courseQuery = useQuery({ queryKey: ['courseGraph', courseId], queryFn: () => fetchCourse(Number(courseId)), enabled: Boolean(courseId && Number(courseId) > 0) })

  const outcomes = useMemo(() => courseQuery.data?.modules.flatMap((module) => module.learning_outcomes.map((outcome) => ({ ...outcome, moduleTitle: module.title }))) ?? [], [courseQuery.data])
  const modules = courseQuery.data?.modules ?? []

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['projects', projectId, 'assessments'] })

  const generateMutation = useMutation({
    mutationFn: (payload: any) => generateAssessment(projectId as string, payload),
    onSuccess: async (assessment: any) => {
      setSelectedAssessmentId(assessment.id)
      await refresh()
      toast.success('Assessment generated')
    }
  })

  const renameMutation = useMutation({
    mutationFn: ({ id, title }: { id: number; title: string }) => renameAssessment(numericProjectId, id, title),
    onSuccess: async () => {
      await refresh()
      setRenaming(null)
      toast.success('Assessment renamed')
    }
  })

  const archiveMutation = useMutation({
    mutationFn: (assessmentId: number) => archiveAssessment(numericProjectId, assessmentId),
    onSuccess: async (_, archivedId) => {
      if (selectedAssessmentId === archivedId) setSelectedAssessmentId(null)
      await refresh()
      toast.success('Archived successfully')
    }
  })

  useEffect(() => {
    if (assessmentsQuery.data?.length && selectedAssessmentId === null) setSelectedAssessmentId(assessmentsQuery.data[0].id)
  }, [assessmentsQuery.data, selectedAssessmentId])

  const handleGenerate = () => {
    if (scope === 'outcome') {
      const outcome = outcomes.find((item) => item.id === Number(selectedOutcomeId))
      if (!outcome || !projectId) return toast.error('Select a learning outcome first.')
      generateMutation.mutate({ learning_outcome_id: outcome.id, outcome_text: outcome.statement, scope: 'outcome' })
    } else if (scope === 'module') {
      if (!selectedModuleId) return toast.error('Select a module first.'); generateMutation.mutate({ target_id: Number(selectedModuleId), scope: 'module', outcome_text: modules.find((module) => module.id === Number(selectedModuleId))?.title })
    } else {
      if (!courseQuery.data?.id) return toast.error('Course is unavailable.'); generateMutation.mutate({ target_id: courseQuery.data.id, scope: 'course', outcome_text: courseQuery.data.title })
    }
  }

  const assessments = assessmentsQuery.data ?? []
  const selectedAssessment = assessments.find((item) => item.id === selectedAssessmentId)

  if (!validProjectId || assessmentsQuery.isError || courseQuery.isError) return (
    <section className="flex min-h-[480px] items-center justify-center p-8">
      <div className="w-full max-w-xl rounded-2xl border border-rose-500/30 bg-rose-500/5 p-8 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-300">Assessments unavailable</p>
        <h1 className="mt-3 text-xl font-semibold text-zinc-100">Failed to load assessments</h1>
        <p className="mt-2 text-sm text-zinc-400">Check that the API is running and the project has been seeded.</p>
      </div>
    </section>
  )

  if (assessmentsQuery.isLoading || courseQuery.isLoading) return (
    <section className="p-8 text-sm text-zinc-400">Loading assessments...</section>
  )

  return (
    <div className="grid h-full min-h-[640px] grid-cols-1 lg:grid-cols-[310px_minmax(0,1fr)]">
      <aside className="border-b border-zinc-800 bg-zinc-900/40 p-4 lg:border-b-0 lg:border-r">
        <div className="px-2 pb-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400">Assessment compiler</p>
          <h1 className="mt-2 text-lg font-semibold text-zinc-100">Assessments</h1>
        </div>

        <div className="space-y-2">
          {assessments.map((assessment) => (
            <div key={assessment.id} className={`flex items-start gap-1 rounded-xl border p-1 transition-colors ${selectedAssessmentId === assessment.id ? 'border-cyan-500/40 bg-cyan-500/10' : 'border-zinc-800 bg-zinc-950/40 hover:border-zinc-700 hover:bg-zinc-900'}`}>
              <button type="button" onClick={() => setSelectedAssessmentId(assessment.id)} className="min-w-0 flex-1 p-2 text-left">
                <p className="truncate text-sm font-medium text-zinc-100">{assessment.title}</p>
                <div className="mt-1 flex items-center gap-2">
                  <p className="text-xs text-zinc-500">{assessment.questions.length} questions</p>
                  <span className="rounded-full border border-zinc-700 bg-zinc-800 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-zinc-400">
                    {scopeLabel(assessment)}
                  </span>
                </div>
                <p className="mt-1 truncate text-[11px] text-cyan-300/80">{targetLabel(assessment)}</p>
              </button>
              <ActionMenu disabled={archiveMutation.isPending} onRename={() => setRenaming(assessment)} onArchive={() => archiveMutation.mutate(assessment.id)} />
            </div>
          ))}
          {assessments.length === 0 && <p className="rounded-xl border border-dashed border-zinc-700 p-4 text-sm text-zinc-400">No assessments yet.</p>}
        </div>

        <div className="mt-6 rounded-xl border border-zinc-700 bg-zinc-950 p-4">
          <p className="text-sm font-semibold text-zinc-100">Generate New</p>
          <p className="mt-1 text-xs leading-5 text-zinc-400">Build an assessment scoped to an outcome, module, or course.</p>

          <select value={scope} onChange={(e) => setScope(e.target.value as any)} className="mt-3 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 outline-none focus:border-cyan-500">
            <option value="outcome">Outcome Quiz</option>
            <option value="module">Module Exam</option>
            <option value="course">Final Exam</option>
          </select>

          {scope === 'outcome' && (
            <select value={selectedOutcomeId} onChange={(event) => setSelectedOutcomeId(event.target.value)} className="mt-3 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 outline-none focus:border-cyan-500">
              <option value="">Select a learning outcome</option>
              {outcomes.map((outcome) => <option key={outcome.id} value={outcome.id}>{outcome.moduleTitle}: {outcome.statement}</option>)}
            </select>
          )}

          {scope === 'module' && (
            <select value={selectedModuleId} onChange={(event) => setSelectedModuleId(event.target.value)} className="mt-3 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 outline-none focus:border-cyan-500">
              <option value="">Select a module</option>
              {modules.map((module) => <option key={module.id} value={module.id}>{module.title}</option>)}
            </select>
          )}

          <button
            type="button"
            onClick={handleGenerate}
            disabled={(scope === 'outcome' && !selectedOutcomeId) || (scope === 'module' && !selectedModuleId) || generateMutation.isPending}
            className="mt-3 w-full rounded-lg bg-cyan-500 px-3 py-2 text-sm font-semibold text-zinc-950 transition-colors hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {generateMutation.isPending ? 'Generating assessment...' : `Generate ${scope === 'outcome' ? 'Quiz' : scope === 'module' ? 'Exam' : 'Final'}`}
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
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400">Generated assessment</p>
                <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-cyan-200">{scopeLabel(selectedAssessment)}</span>
              </div>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-zinc-100">{selectedAssessment.title}</h2>
              <p className="mt-2 text-sm text-cyan-200/80">Target: {targetLabel(selectedAssessment)}</p>
              <p className="mt-2 text-sm text-zinc-400">{selectedAssessment.questions.length} questions â€¢ {selectedAssessment.rubric.total_points ?? 'â€”'} total points</p>
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
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium text-zinc-200">{criterion.criterion}</p>
                        <span className="text-xs text-cyan-300">{criterion.points} pts</span>
                      </div>
                      <p className="mt-2 text-xs leading-5 text-zinc-400">{criterion.description}</p>
                    </div>
                  ))}
                </div>
              </aside>
            </div>
          </div>
        ) : (
          <div className="flex min-h-[420px] items-center justify-center rounded-2xl border border-dashed border-zinc-700 bg-zinc-900/20 p-8 text-center">
            <div>
              <h2 className="text-lg font-semibold text-zinc-200">Select an assessment</h2>
              <p className="mt-2 text-sm text-zinc-400">Choose an existing assessment or generate one from a learning outcome.</p>
            </div>
          </div>
        )}
      </section>

      <RenameModal isOpen={Boolean(renaming)} title="Rename assessment" currentName={renaming?.title ?? ''} onClose={() => setRenaming(null)} isSaving={renameMutation.isPending} onSave={(title) => { if (renaming) renameMutation.mutate({ id: renaming.id, title }) }} />
    </div>
  )
}
