'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface NavItem {
  href: string
  icon: string
  label: string
}

export function BottomNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-mobile bg-bg-primary/95 backdrop-blur-md border-t border-border z-50">
      <div className="flex justify-around py-2.5 px-4">
        {items.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 ${isActive ? 'text-accent-orange' : 'text-text-muted'}`}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="text-[10px]">{item.label}</span>
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
  { href: '/m/progress', icon: '📊', label: 'Progress' },
  { href: '/m/profile', icon: '👤', label: 'Profile' },
]
