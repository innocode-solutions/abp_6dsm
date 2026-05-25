import { Bot } from 'lucide-react'

type RobotIconProps = {
  className?: string
  antenna?: boolean
}

/** Simple robot head for branding (inline style). */
export function RobotIcon({ className, antenna = true }: RobotIconProps) {
  return (
    <div
      className={['relative flex items-center justify-center', className]
        .filter(Boolean)
        .join(' ')}
    >
      {antenna && (
        <span className="absolute -top-1.5 left-1/2 h-2 w-0.5 -translate-x-1/2 rounded-full bg-[#CC2229]" />
      )}
      <Bot className="size-[1.15em] text-white" strokeWidth={1.75} aria-hidden />
    </div>
  )
}
