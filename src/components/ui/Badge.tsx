type BadgeColor = 'orange' | 'green' | 'red' | 'yellow' | 'blue' | 'purple' | 'gray'

interface BadgeProps {
  variant?: BadgeColor
  color?: BadgeColor
  children: React.ReactNode
  className?: string
}

const variants = {
  orange: 'bg-accent-orange/10 text-accent-orange border-accent-orange/20',
  green: 'bg-status-green/10 text-status-green border-status-green/20',
  red: 'bg-status-red/10 text-status-red border-status-red/20',
  yellow: 'bg-status-yellow/10 text-status-yellow border-status-yellow/20',
  blue: 'bg-status-blue/10 text-status-blue border-status-blue/20',
  purple: 'bg-status-purple/10 text-status-purple border-status-purple/20',
  gray: 'bg-white/5 text-text-secondary border-border-light',
}

export function Badge({ variant, color, children, className = '' }: BadgeProps) {
  const v = color || variant || 'gray'
  return (
    <span className={`${variants[v]} inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${className}`}>
      {children}
    </span>
  )
}
