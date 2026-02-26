'use client'
import { BottomNav, ownerNavItems } from '@/components/layout/BottomNav'
import { OwnerAuthProvider } from '@/lib/auth-context'

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="pb-20">
      <header className="sticky top-0 z-40 bg-bg-primary border-b border-border px-4 py-3 pt-[env(safe-area-inset-top)]">
        <div className="flex items-center justify-between max-w-mobile mx-auto">
          <h1 className="text-lg font-bold text-accent-orange">RepCount</h1>
          <span className="text-xs text-text-secondary">Owner Panel</span>
        </div>
      </header>
      <OwnerAuthProvider>
        <main className="max-w-mobile mx-auto">{children}</main>
      </OwnerAuthProvider>
      <BottomNav items={ownerNavItems} />
    </div>
  )
}
