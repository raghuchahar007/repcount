import { HTMLAttributes } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'gradient' | 'alert-danger' | 'alert-warning' | 'alert-success' | 'alert-info'
}

const cardVariants = {
  default: 'bg-bg-card border border-border',
  gradient: 'bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460]',
  'alert-danger': 'bg-status-red/[0.06] border border-status-red/20',
  'alert-warning': 'bg-status-yellow/[0.06] border border-status-yellow/20',
  'alert-success': 'bg-status-green/[0.06] border border-status-green/20',
  'alert-info': 'bg-status-blue/[0.06] border border-status-blue/20',
}

export function Card({ variant = 'default', className = '', children, ...props }: CardProps) {
  return (
    <div className={`${cardVariants[variant]} rounded-2xl p-4 ${className}`} {...props}>
      {children}
    </div>
  )
}
