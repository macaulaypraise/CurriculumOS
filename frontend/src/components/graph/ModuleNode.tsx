import { Handle, Position, type NodeProps } from 'reactflow'

export interface ModuleNodeData {
  label?: string
  title?: string
  description?: string
  lessonCount?: number
  outcomeCount?: number
  status?: 'current' | 'complete' | 'proposed'
  dimmed?: boolean
  focused?: boolean
  updated?: boolean
  onClick?: () => void
}

const statusStrip = {
  current: 'border-l-cyan-500',
  complete: 'border-l-emerald-500',
  proposed: 'border-l-purple-500',
}

export function ModuleNode({ data, selected }: NodeProps<ModuleNodeData>) {
  const title = data.title ?? data.label ?? 'Curriculum Module'
  const status = data.status ?? 'current'

  return (
    <div
      onClick={data.onClick}
      className={`relative min-w-[220px] max-w-[260px] cursor-pointer rounded-[15px] border border-zinc-800 border-l-2 ${statusStrip[status]} bg-zinc-900 p-4 shadow-lg shadow-black/20 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-zinc-600 hover:shadow-xl hover:shadow-black/35 ${data.dimmed ? 'scale-[0.98] opacity-25' : 'opacity-100'} ${selected || data.focused ? 'animate-[pulse_2s_ease-out_infinite] border-zinc-600 shadow-cyan-500/10' : ''} ${data.updated ? 'shadow-[0_0_15px_rgba(6,182,212,0.5)] ring-1 ring-cyan-400/60' : ''}`}
    >
      <Handle type="target" position={Position.Top} className="!h-1.5 !w-1.5 !border-zinc-950 !bg-zinc-600" />
      {data.updated && <span className="absolute -right-2 -top-2 rounded-full border border-cyan-400/40 bg-cyan-500 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-zinc-950">Updated</span>}
      <div className="space-y-2">
        <h3 className="truncate text-sm font-semibold text-zinc-100">{title}</h3>
        <p className="truncate text-xs text-zinc-400">{data.description ?? 'Structured learning sequence and prerequisite relationships.'}</p>
      </div>
      <div className="mt-3 flex items-center gap-1.5 text-[10px] text-zinc-500">
        <span>📚 {data.lessonCount ?? 0} Lessons</span>
        <span>•</span>
        <span>🎯 {data.outcomeCount ?? 0} Outcomes</span>
      </div>
      <Handle type="source" position={Position.Bottom} className="!h-1.5 !w-1.5 !border-zinc-950 !bg-cyan-500" />
    </div>
  )
}
