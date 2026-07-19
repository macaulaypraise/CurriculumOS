import { Handle, Position, type NodeProps } from 'reactflow'

interface LessonNodeData {
  label?: string
  title?: string
  dimmed?: boolean
  focused?: boolean
}

export function LessonNode({ data }: NodeProps<LessonNodeData>) {
  return (
    <div className={`w-[192px] cursor-pointer rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-300 shadow-sm shadow-black/20 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-zinc-600 hover:shadow-md ${data.dimmed ? 'opacity-25' : 'opacity-100'} ${data.focused ? 'border-cyan-500/60 text-zinc-100' : ''}`}>
      <Handle type="target" position={Position.Top} className="!h-1.5 !w-1.5 !border-zinc-950 !bg-zinc-600" />
      <span className="block truncate">{data.title ?? data.label ?? 'Lesson'}</span>
      <Handle type="source" position={Position.Bottom} className="!h-1.5 !w-1.5 !border-zinc-950 !bg-zinc-600" />
    </div>
  )
}
