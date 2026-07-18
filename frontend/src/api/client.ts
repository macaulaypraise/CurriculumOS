import axios from 'axios'

export interface Lesson {
  id: number
  title: string
  description: string
  position: number
}

export interface LearningOutcome {
  id: number
  statement: string
}

export interface CourseModule {
  id: number
  title: string
  description: string
  position: number
  lessons: Lesson[]
  learning_outcomes: LearningOutcome[]
}

export interface Course {
  id?: number
  title: string
  description: string
  modules: CourseModule[]
  is_demo_mode?: boolean
}

export interface CurriculumPR {
  summary: string
  risk_level: 'low' | 'medium' | 'high'
  affected_items: string[]
  generated_diff: string
}

export interface CurriculumVersion {
  id: number
  project_id: number
  course_id: number
  version_number: number
  description: string
  snapshot: Record<string, unknown>
  created_at: string
}

export interface AssessmentQuestion {
  question: string
  prompt?: string
  parts?: string[]
  points?: number
}

export interface AssessmentRubricCriterion {
  criterion: string
  points: number
  description: string
}

export interface Assessment {
  id: number
  project_id: number
  course_id: number
  learning_outcome_id: number | null
  title: string
  questions: AssessmentQuestion[]
  rubric: { total_points?: number; criteria?: AssessmentRubricCriterion[] }
  created_at: string
}

export interface AssessmentGenerationData {
  learning_outcome_id: number
  outcome_text: string
}

export interface ActivityEvent {
  id: number
  project_id: number
  event_type: string
  description: string
  created_at: string
}

let demoModeHandler: ((isDemoMode: boolean) => void) | undefined

export function setDemoModeHandler(handler: (isDemoMode: boolean) => void) {
  demoModeHandler = handler
}

export const apiClient = axios.create({ baseURL: 'http://localhost:8000' })

apiClient.interceptors.request.use((config) => {
  const apiKey = localStorage.getItem('curriculumos_openai_key')
  if (apiKey) config.headers.set('X-OpenAI-Key', apiKey)
  return config
})

apiClient.interceptors.response.use((response) => {
  if (response.data?.is_demo_mode === true) demoModeHandler?.(true)
  return response
})

export async function fetchCourse(courseId: number): Promise<Course> {
  const { data } = await apiClient.get<Course>(`/curriculum/${courseId}`)
  return data
}

export async function fetchProjectGraph(projectId: string | number): Promise<Course> {
  const { data } = await apiClient.get<Course>(`/projects/${projectId}/graph`)
  return data
}

export async function proposeChange(courseId: number, userPrompt: string): Promise<CurriculumPR> {
  const { data } = await apiClient.post<CurriculumPR>('/changes/propose', { course_id: courseId, user_prompt: userPrompt })
  return data
}

export async function approveChange(projectId: number, changeDescription: string): Promise<CurriculumVersion> {
  const { data } = await apiClient.post<CurriculumVersion>(`/projects/${projectId}/approve-change`, { change_description: changeDescription })
  return data
}

export async function fetchProjectVersions(projectId: string | number): Promise<CurriculumVersion[]> {
  const { data } = await apiClient.get<CurriculumVersion[]>(`/projects/${projectId}/versions`)
  return data
}

export async function fetchProjectAssessments(projectId: string | number): Promise<Assessment[]> {
  const { data } = await apiClient.get<Assessment[]>(`/projects/${projectId}/assessments`)
  return data
}

export async function generateAssessment(projectId: string | number, payload: AssessmentGenerationData): Promise<Assessment> {
  const { data } = await apiClient.post<Assessment>(`/projects/${projectId}/assessments/generate`, payload)
  return data
}

export async function fetchProjectActivity(projectId: string | number): Promise<ActivityEvent[]> {
  const { data } = await apiClient.get<ActivityEvent[]>(`/projects/${projectId}/activity`)
  return data
}

export const fetchVersions = fetchProjectVersions
