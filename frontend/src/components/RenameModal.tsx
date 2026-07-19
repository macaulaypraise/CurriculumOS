import { useEffect, useState, type FormEvent } from 'react'

interface RenameModalProps { isOpen: boolean; title: string; currentName: string; onClose: () => void; onSave: (name: string) => void; isSaving?: boolean }

export function RenameModal({ isOpen, title, currentName, onClose, onSave, isSaving = false }: RenameModalProps) {
  const [name, setName] = useState(currentName)
  useEffect(() => { if (isOpen) setName(currentName) }, [currentName, isOpen])
  if (!isOpen) return null
  const submit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const trimmed = name.trim(); if (trimmed) onSave(trimmed) }
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true"><form onSubmit={submit} className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl shadow-black/50"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400">Rename</p><h2 className="mt-2 text-xl font-semibold text-zinc-100">{title}</h2><label className="mt-6 block text-sm font-medium text-zinc-300" htmlFor="rename-value">Name</label><input id="rename-value" value={name} onChange={(event) => setName(event.target.value)} autoFocus className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-cyan-500" /><div className="mt-6 flex justify-end gap-2"><button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-semibold text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100">Cancel</button><button type="submit" disabled={!name.trim() || isSaving} className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50">{isSaving ? 'Saving...' : 'Save'}</button></div></form></div>
}
