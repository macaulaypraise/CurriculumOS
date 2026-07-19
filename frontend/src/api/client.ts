import axios from 'axios'

export interface Lesson { id: number; title: string; description: string; position: number }
export interface LearningOutcome { id: number; statement: string }
export interface CourseModule { id: number; title: string; description: string; position: number; lessons: Lesson[]; learning_outcomes: LearningOutcome[] }
export interface Course { id?: number; project_id?: number; title: string; description: string; modules: CourseModule[]; is_demo_mode?: boolean }
export interface CourseSummary { id: number; project_id: number; title: string; description: string | null; module_count: number; created_at?: string }
export interface Project { id: number; name: string; description?: string | null; is_archived?: boolean; created_at: string; updated_at: string }
export interface CurriculumPR { summary: string; risk_level: 'low' | 'medium' | 'high'; affected_items: string[]; generated_diff: string }
export interface CurriculumVersion { id: number; project_id: number; course_id: number; version_number: number; description: string; snapshot: Record<string, unknown>; created_at: string }
export interface AssessmentQuestion { question: string; prompt?: string; parts?: string[]; points?: number }
export interface AssessmentRubricCriterion { criterion: string; points: number; description: string }
export interface Assessment { id: number; project_id: number; course_id: number; learning_outcome_id: number | null; title: string; questions: AssessmentQuestion[]; rubric: { total_points?: number; criteria?: AssessmentRubricCriterion[] }; created_at: string }
export interface AssessmentGenerationData { learning_outcome_id: number; outcome_text: string }
export interface ActivityEvent { id: number; project_id: number; event_type: string; description: string; created_at: string }
export interface UploadCurriculumResponse { project_id: number; course_id: number; is_fallback: boolean; message: string }

let demoModeHandler: ((isDemoMode: boolean) => void) | undefined
export function setDemoModeHandler(handler: (isDemoMode: boolean) => void) { demoModeHandler = handler }
export const apiClient = axios.create({ baseURL: 'http://localhost:8000' })
apiClient.interceptors.request.use((config) => { const apiKey = localStorage.getItem('curriculumos_openai_key'); const provider = localStorage.getItem('curriculumos_ai_provider'); if (apiKey) config.headers.set('X-AI-Key', apiKey); if (provider) config.headers.set('X-AI-Provider', provider); return config })
apiClient.interceptors.response.use((response) => { if (response.data?.is_demo_mode === true) demoModeHandler?.(true); return response })

export async function fetchProjects(): Promise<Project[]> { const { data } = await apiClient.get<Project[]>('/projects'); return data }
export async function createProject(name: string): Promise<Project> { const { data } = await apiClient.post<Project>('/projects', { name }); return data }
export async function renameProject(projectId: number, name: string): Promise<Project> { const { data } = await apiClient.patch<Project>(`/projects/${projectId}`, { name }); return data }
export async function archiveProject(projectId: number): Promise<void> { await apiClient.delete(`/projects/${projectId}`) }
export async function fetchProjectCourses(projectId: string | number): Promise<CourseSummary[]> { const { data } = await apiClient.get<CourseSummary[]>(`/projects/${projectId}/courses`); return data }
export async function renameCourse(projectId: number, courseId: number, title: string): Promise<CourseSummary> { const { data } = await apiClient.patch<CourseSummary>(`/projects/${projectId}/courses/${courseId}`, { title }); return data }
export async function archiveCourse(projectId: number, courseId: number): Promise<void> { await apiClient.delete(`/projects/${projectId}/courses/${courseId}`) }
export async function uploadFile(projectId: number, file: File): Promise<UploadCurriculumResponse> { const form = new FormData(); form.append('file', file); const { data } = await apiClient.post<UploadCurriculumResponse>(`/projects/${projectId}/upload`, form); return data }
export async function createCourseWithFile(projectId: number, name: string, file: File): Promise<UploadCurriculumResponse> { const form = new FormData(); form.append('course_name', name); form.append('file', file); const { data } = await apiClient.post<UploadCurriculumResponse>(`/projects/${projectId}/upload`, form); return data }
export async function fetchCourse(courseId: number): Promise<Course> { const { data } = await apiClient.get<Course>(`/curriculum/${courseId}`); return data }
export async function fetchProjectGraph(projectId: string | number): Promise<Course> { const { data } = await apiClient.get<Course>(`/projects/${projectId}/graph`); return data }
export async function proposeChange(courseId: number, userPrompt: string): Promise<CurriculumPR> { const { data } = await apiClient.post<CurriculumPR>('/changes/propose', { course_id: courseId, user_prompt: userPrompt }); return data }
export async function approveChange(projectId: number, changeDescription: string): Promise<CurriculumVersion> { const { data } = await apiClient.post<CurriculumVersion>(`/projects/${projectId}/approve-change`, { change_description: changeDescription }); return data }
export async function fetchProjectVersions(projectId: string | number): Promise<CurriculumVersion[]> { const { data } = await apiClient.get<CurriculumVersion[]>(`/projects/${projectId}/versions`); return data }
export async function fetchProjectAssessments(projectId: string | number): Promise<Assessment[]> { const { data } = await apiClient.get<Assessment[]>(`/projects/${projectId}/assessments`); return data }
export async function generateAssessment(projectId: string | number, payload: AssessmentGenerationData): Promise<Assessment> { const { data } = await apiClient.post<Assessment>(`/projects/${projectId}/assessments/generate`, payload); return data }
export async function renameAssessment(projectId: number, assessmentId: number, title: string): Promise<Assessment> { const { data } = await apiClient.patch<Assessment>(`/projects/${projectId}/assessments/${assessmentId}`, { title }); return data }
export async function archiveAssessment(projectId: number, assessmentId: number): Promise<void> { await apiClient.delete(`/projects/${projectId}/assessments/${assessmentId}`) }
export async function fetchProjectActivity(projectId: string | number): Promise<ActivityEvent[]> { const { data } = await apiClient.get<ActivityEvent[]>(`/projects/${projectId}/activity`); return data }
export const fetchVersions = fetchProjectVersions
