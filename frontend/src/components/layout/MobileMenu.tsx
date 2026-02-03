import { NavLink } from 'react-router-dom'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { Home, Info, Mail, Calendar, Trophy } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/use-auth'

interface MobileMenuProps {
  isOpen: boolean
  onClose: () => void
}

const baseNavItems = [
  { to: '/', label: 'المساجد', icon: Home },
  { to: '/about', label: 'عن الموقع', icon: Info },
  { to: '/contact', label: 'تواصل معنا', icon: Mail },
]

const leaderboardItem = { to: '/leaderboard', label: 'المتصدرون', icon: Trophy }
const trackerItem = { to: '/tracker', label: 'متابعة التراويح', icon: Calendar }

export function MobileMenu({ isOpen, onClose }: MobileMenuProps) {
  const { isAuthenticated } = useAuth()
  const navItems = isAuthenticated ? [...baseNavItems, trackerItem, leaderboardItem] : [...baseNavItems, leaderboardItem]
  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="top"
        className="h-auto border-0 border-b-2 border-accent/30 bg-primary-dark p-0"
      >
        <nav className="flex flex-col gap-1 px-4 py-5">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  'group relative flex w-full items-center gap-3 rounded-lg px-4 h-12 text-base font-medium text-white/80 transition-all duration-200',
                  'hover:bg-white/10 hover:text-white',
                  'active:scale-[0.98]',
                  isActive && 'bg-white/10 text-accent-light border-e-2 border-accent'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    className={cn(
                      'h-5 w-5 transition-colors duration-200',
                      isActive ? 'text-accent' : 'text-white/50 group-hover:text-white/80'
                    )}
                  />
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  )
}
