import { useEffect, useState } from 'react'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
  onSaved: () => void
}

const STORAGE_KEY = 'curriculumos_openai_key'

export function SettingsModal({ isOpen, onClose, onSaved }: SettingsModalProps) {
  const [apiKey, setApiKey] = useState('')

  useEffect(() => {
    if (isOpen) setApiKey(localStorage.getItem(STORAGE_KEY) ?? '')
  }, [isOpen])

  if (!isOpen) return null

  const save = () => {
    const trimmed = apiKey.trim()
    if (trimmed) localStorage.setItem(STORAGE_KEY, trimmed)
    else localStorage.removeItem(STORAGE_KEY)
    onSaved()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/80 p-4 backdrop-blur-sm">
      <section role="dialog" aria-modal="true" aria-labelledby="settings-title" className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl shadow-black/40">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400">Settings</p>
        <h2 id="settings-title" className="mt-2 text-xl font-semibold text-slate-100">Bring your own key</h2>
        <p className="mt-2 text-sm leading-6 text-slate-400">Your key is stored only in this browser and sent as an X-OpenAI-Key header for live requests.</p>
        <input type="password" value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder="sk-..." className="mt-5 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400" />
        <div className="mt-5 flex justify-end gap-3"><button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-slate-300 hover:bg-slate-800">Cancel</button><button type="button" onClick={save} className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-400">Save key</button></div>
      </section>
    </div>
  )
}
