import { Link, useLocation } from 'react-router-dom'

interface NavItem {
  href: string
  icon: string
  label: string
}

export function BottomNav({ items }: { items: NavItem[] }) {
  const { pathname } = useLocation()

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-mobile bg-bg-primary border-t border-border z-50 pb-[env(safe-area-inset-bottom)]">
      <div className="flex justify-around px-4">
        {items.map((item) => {
          const isActive = item.href === '/m' || item.href === '/owner'
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              to={item.href}
              className={`flex flex-col items-center justify-center gap-0.5 min-h-[48px] py-3 active:opacity-70 transition-opacity ${isActive ? 'text-accent-orange' : 'text-text-muted'}`}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="text-[11px]">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

export const ownerNavItems: NavItem[] = [
  { href: '/owner', icon: '📊', label: 'Dashboard' },
  { href: '/owner/members', icon: '👥', label: 'Members' },
  { href: '/owner/leads', icon: '📥', label: 'Leads' },
  { href: '/owner/posts', icon: '📝', label: 'Posts' },
  { href: '/owner/settings', icon: '⚙️', label: 'Settings' },
]

export const memberNavItems: NavItem[] = [
  { href: '/m', icon: '🏠', label: 'Home' },
  { href: '/m/diet', icon: '🍽️', label: 'Diet' },
  { href: '/m/workout', icon: '🏋️', label: 'Workout' },
  { href: '/m/feed', icon: '📣', label: 'Feed' },
  { href: '/m/profile', icon: '👤', label: 'Profile' },
]
