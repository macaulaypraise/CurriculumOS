import { useState, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { createProject } from '../api/client'

interface CreateProjectModalProps {
  isOpen: boolean
  onClose: () => void
}

export function CreateProjectModal({ isOpen, onClose }: CreateProjectModalProps) {
  const [name, setName] = useState('')
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: () => createProject(name.trim()),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['projects'] })
      toast.success('Project Created')
      setName('')
      onClose()
    },
  })

  if (!isOpen) return null

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (name.trim()) mutation.mutate()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-labelledby="create-project-title">
      <form onSubmit={submit} className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl shadow-black/50">
        <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400">New workspace</p><h2 id="create-project-title" className="mt-2 text-xl font-semibold text-zinc-100">Create Project</h2></div><button type="button" onClick={onClose} className="rounded-md px-2 py-1 text-zinc-500 transition hover:bg-zinc-800 hover:text-zinc-200" aria-label="Close">×</button></div>
        <label className="mt-6 block text-sm font-medium text-zinc-300" htmlFor="project-name">Project Name</label>
        <input id="project-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Nursing Degree 2026" autoFocus className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-cyan-500" />
        {mutation.isError && <p className="mt-3 text-sm text-rose-300">Unable to create the project. Please try again.</p>}
        <button type="submit" disabled={!name.trim() || mutation.isPending} className="mt-6 w-full rounded-lg bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-zinc-950 transition duration-200 ease-out hover:scale-[1.02] hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50">{mutation.isPending ? 'Creating Project…' : 'Create Project'}</button>
      </form>
    </div>
  )
}
