import { useEffect, useState, type FormEvent, type KeyboardEvent } from 'react'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
  onSaved: (apiKey: string | null) => void
}

export function SettingsModal({ isOpen, onClose, onSaved }: SettingsModalProps) {
  const [apiKey, setApiKey] = useState('')
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      setApiKey(localStorage.getItem('curriculumos_openai_key') ?? '')
      setMessage(null)
    }
  }, [isOpen])

  if (!isOpen) {
    return null
  }

  const closeAfterFeedback = () => {
    window.setTimeout(onClose, 650)
  }

  const saveKey = () => {
    const trimmedKey = apiKey.trim()

    if (!trimmedKey) {
      setMessage('Enter an API key or choose Clear Key to use Demo Mode.')
      return
    }

    localStorage.setItem('curriculumos_openai_key', trimmedKey)
    onSaved(trimmedKey)
    setMessage('API Key Saved')
    closeAfterFeedback()
  }

  const clearKey = () => {
    localStorage.removeItem('curriculumos_openai_key')
    setApiKey('')
    onSaved(null)
    setMessage('Interactive Demo Mode enabled')
    closeAfterFeedback()
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    saveKey()
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      saveKey()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true">
      <form onSubmit={handleSubmit} className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl shadow-black/50">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400">Settings</p>
            <h2 className="mt-2 text-xl font-semibold text-zinc-100">OpenAI API key</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-md px-2 py-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200">
            ×
          </button>
        </div>

        <label className="mt-6 block text-sm font-medium text-zinc-300" htmlFor="openai-api-key">
          API key
        </label>
        <input
          id="openai-api-key"
          type="text"
          value={apiKey}
          onChange={(event) => setApiKey(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="sk-..."
          autoComplete="off"
          spellCheck={false}
          autoFocus
          className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-cyan-500"
        />
        <p className="mt-2 text-xs leading-5 text-zinc-400">
          Leave blank to use the Interactive Demo environment. Enter a valid OpenAI API key to enable Live AI processing.
        </p>

        <div className="mt-5 flex items-center justify-between gap-4">
          <p className={`text-sm ${message?.includes('Saved') || message?.includes('enabled') ? 'text-emerald-400' : 'text-amber-300'}`}>
            {message}
          </p>
          <div className="flex items-center gap-2">
            <button type="button" onClick={clearKey} className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100">
              Clear Key
            </button>
            <button type="submit" className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-cyan-400">
              Save Key
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
