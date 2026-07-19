import { useEffect, useState, type FormEvent, type KeyboardEvent } from 'react'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
  onSaved: (apiKey: string | null) => void
}

const providers = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'groq', label: 'Groq (Fastest)' },
  { value: 'gemini', label: 'Gemini' },
  { value: 'openrouter', label: 'OpenRouter (Claude)' },
]

export function SettingsModal({ isOpen, onClose, onSaved }: SettingsModalProps) {
  const [apiKey, setApiKey] = useState('')
  const [provider, setProvider] = useState('openai')
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      setApiKey(localStorage.getItem('curriculumos_openai_key') ?? '')
      setProvider(localStorage.getItem('curriculumos_ai_provider') ?? 'openai')
      setMessage(null)
    }
  }, [isOpen])

  if (!isOpen) return null

  const closeAfterFeedback = () => window.setTimeout(onClose, 650)

  const saveKey = () => {
    const trimmedKey = apiKey.trim()
    if (!trimmedKey) { setMessage('Enter an API key or choose Clear Key to use Demo Mode.'); return }
    localStorage.setItem('curriculumos_openai_key', trimmedKey)
    localStorage.setItem('curriculumos_ai_provider', provider)
    onSaved(trimmedKey)
    setMessage('AI provider and key saved')
    closeAfterFeedback()
  }

  const clearKey = () => {
    localStorage.removeItem('curriculumos_openai_key')
    localStorage.removeItem('curriculumos_ai_provider')
    setApiKey('')
    setProvider('openai')
    onSaved(null)
    setMessage('Interactive Demo Mode enabled')
    closeAfterFeedback()
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); saveKey() }
  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => { if (event.key === 'Enter') { event.preventDefault(); saveKey() } }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-labelledby="settings-title">
      <form onSubmit={handleSubmit} className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl shadow-black/50">
        <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400">Settings</p><h2 id="settings-title" className="mt-2 text-xl font-semibold text-zinc-100">Universal AI access</h2></div><button type="button" onClick={onClose} className="rounded-md px-2 py-1 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-200" aria-label="Close settings">×</button></div>
        <label className="mt-6 block text-sm font-medium text-zinc-300" htmlFor="ai-provider">AI Provider</label>
        <select id="ai-provider" value={provider} onChange={(event) => setProvider(event.target.value)} className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 outline-none transition-colors focus:border-cyan-500">
          {providers.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
        </select>
        <label className="mt-5 block text-sm font-medium text-zinc-300" htmlFor="openai-api-key">API key</label>
        <input id="openai-api-key" type="text" value={apiKey} onChange={(event) => setApiKey(event.target.value)} onKeyDown={handleKeyDown} placeholder="Paste your provider key" autoComplete="off" spellCheck={false} autoFocus className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-600 focus:border-cyan-500" />
        <p className="mt-2 text-xs leading-5 text-zinc-400">Bring a key from OpenAI, Groq, Gemini, or OpenRouter. Leave the key blank to use the Interactive Demo environment.</p>
        <div className="mt-5 flex items-center justify-between gap-4"><p className={`text-sm ${message?.includes('saved') || message?.includes('enabled') ? 'text-emerald-400' : 'text-amber-300'}`} aria-live="polite">{message}</p><div className="flex items-center gap-2"><button type="button" onClick={clearKey} className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-zinc-100">Clear Key</button><button type="submit" className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-zinc-950 transition-colors hover:bg-cyan-400">Save Key</button></div></div>
      </form>
    </div>
  )
}
