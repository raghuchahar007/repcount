'use client'
import { InputHTMLAttributes, forwardRef } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', ...props }, ref) => (
    <div className="w-full">
      {label && <label className="block text-sm text-text-secondary mb-1.5">{label}</label>}
      <input
        ref={ref}
        className={`w-full bg-bg-card border ${error ? 'border-status-red' : 'border-border-light'} rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-orange transition-colors ${className}`}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-status-red">{error}</p>}
    </div>
  )
)
Input.displayName = 'Input'
