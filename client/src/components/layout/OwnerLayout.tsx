import { Link, Outlet } from 'react-router-dom'
import { BottomNav, ownerNavItems } from './BottomNav'

export default function OwnerLayout() {
  return (
    <div className="pb-20">
      <header className="sticky top-0 z-40 bg-bg-primary border-b border-border px-4 py-3 pt-[env(safe-area-inset-top)]">
        <div className="flex items-center justify-between">
          <Link to="/owner" className="text-lg font-bold text-accent-primary">RepCount</Link>
          <span className="text-xs text-text-secondary">Owner Panel</span>
        </div>
      </header>
      <main>
        <Outlet />
      </main>
      <BottomNav items={ownerNavItems} />
    </div>
  )
}
