import { Outlet } from 'react-router-dom'
import { BottomNav, memberNavItems } from './BottomNav'

export default function MemberLayout() {
  return (
    <div className="pb-20">
      <header className="sticky top-0 z-40 bg-bg-primary border-b border-border px-4 py-3 pt-[env(safe-area-inset-top)]">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-accent-orange">RepCount</h1>
          <span className="text-xs text-text-secondary">Member</span>
        </div>
      </header>
      <main>
        <Outlet />
      </main>
      <BottomNav items={memberNavItems} />
    </div>
  )
}
