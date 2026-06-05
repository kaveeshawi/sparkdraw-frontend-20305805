import { Zap } from 'lucide-react'

export default function Logo({ className = '' }) {
  return (
    <div
      className={`sd-logo-mark flex size-8 shrink-0 items-center justify-center rounded-lg text-primary-foreground ${className}`}
    >
      <Zap className="size-4" strokeWidth={2.5} />
    </div>
  )
}
