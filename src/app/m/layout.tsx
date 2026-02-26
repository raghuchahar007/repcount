'use client'
import { BottomNav, memberNavItems } from '@/components/layout/BottomNav'

export default function MemberLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="pb-20">
      <header className="sticky top-0 z-40 bg-bg-primary/95 backdrop-blur-md border-b border-border px-4 py-3">
        <div className="flex items-center justify-between max-w-mobile mx-auto">
          <h1 className="text-lg font-bold text-accent-orange">RepCount</h1>
          <span className="text-xs text-text-secondary">Member</span>
        </div>
      </header>
      <main className="max-w-mobile mx-auto">{children}</main>
      <BottomNav items={memberNavItems} />
    </div>
  )
}
