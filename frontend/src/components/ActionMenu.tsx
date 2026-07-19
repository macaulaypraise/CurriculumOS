import { useEffect, useRef, useState } from 'react'

interface ActionMenuProps { onRename: () => void; onArchive: () => void; disabled?: boolean }

export function ActionMenu({ onRename, onArchive, disabled = false }: ActionMenuProps) {
  const [open, setOpen] = useState(false); const ref = useRef<HTMLDivElement>(null)
  useEffect(() => { const close = (event: MouseEvent) => { if (!ref.current?.contains(event.target as Node)) setOpen(false) }; window.addEventListener('mousedown', close); return () => window.removeEventListener('mousedown', close) }, [])
  const run = (callback: () => void) => { setOpen(false); callback() }
  return <div ref={ref} className="relative" onClick={(event) => event.preventDefault()}><button type="button" disabled={disabled} onClick={(event) => { event.preventDefault(); event.stopPropagation(); setOpen((value) => !value) }} aria-label="Open actions" className="flex h-8 w-8 items-center justify-center rounded-lg text-lg leading-none text-zinc-500 transition hover:bg-zinc-800 hover:text-zinc-100 disabled:cursor-not-allowed disabled:opacity-50">•••</button>{open && <div className="absolute right-0 z-30 mt-2 w-32 overflow-hidden rounded-xl border border-zinc-700 bg-zinc-900 py-1 shadow-2xl shadow-black/40"><button type="button" onClick={() => run(onRename)} className="w-full px-3 py-2 text-left text-sm text-zinc-200 transition hover:bg-zinc-800">Rename</button><button type="button" onClick={() => run(onArchive)} className="w-full px-3 py-2 text-left text-sm text-rose-300 transition hover:bg-rose-500/10">Archive</button></div>}</div>
}
