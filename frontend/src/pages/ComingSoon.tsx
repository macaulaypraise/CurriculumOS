interface ComingSoonProps {
  title: string
  description?: string
}

export function ComingSoon({ title, description }: ComingSoonProps) {
  return (
    <section className="flex h-full min-h-[420px] items-center justify-center p-8">
      <div className="w-full max-w-xl rounded-2xl border border-zinc-800 bg-zinc-900/50 p-10 text-center shadow-2xl shadow-black/20">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-400">
          Project workspace
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-zinc-100">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-zinc-400">
          {description ?? "This workspace capability is coming soon."}
        </p>
        <span className="mt-7 inline-flex rounded-full border border-zinc-700 bg-zinc-950 px-3 py-1 text-xs font-medium text-zinc-400">
          Coming soon
        </span>
      </div>
    </section>
  )
}
