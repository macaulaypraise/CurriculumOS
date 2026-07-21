import { Handle, Position, type NodeProps } from 'reactflow'

interface OutcomeNodeData {
  label?: string
  statement?: string
  dimmed?: boolean
  focused?: boolean
  onClick?: () => void
}

export function OutcomeNode({ data }: NodeProps<OutcomeNodeData>) {
  const text = data.statement ?? data.label ?? 'Learning outcome'

  return (
    <div
      onClick={data.onClick}
      className={`flex h-6 max-w-[190px] cursor-pointer items-center rounded-full border border-zinc-700 bg-zinc-800 px-2 text-xs text-zinc-300 shadow-sm shadow-black/20 transition-all duration-200 ease-out hover:scale-[1.02] hover:border-zinc-600 ${data.dimmed ? 'opacity-20' : 'opacity-100'} ${data.focused ? 'border-cyan-500/70 text-cyan-200' : ''}`}
    >
      <Handle type="target" position={Position.Top} className="!h-1 !w-1 !border-zinc-950 !bg-zinc-600" />
      <span className="truncate">🎯 {text}</span>
    </div>
  )
}
