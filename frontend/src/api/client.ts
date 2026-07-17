import axios from 'axios'

export interface Lesson { title: string; description: string }
export interface LearningOutcome { statement: string }
export interface CourseModule { title: string; description: string; lessons: Lesson[]; learning_outcomes: LearningOutcome[] }
export interface Course { title: string; description: string; modules: CourseModule[]; is_demo_mode?: boolean }

let demoModeHandler: ((isDemoMode: boolean) => void) | undefined

export function setDemoModeHandler(handler: (isDemoMode: boolean) => void) {
  demoModeHandler = handler
}

export const apiClient = axios.create({ baseURL: import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000' })

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
  return (await apiClient.get<Course>(`/curriculum/${courseId}`)).data
}
