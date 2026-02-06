import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Building2,
  Users,
  ArrowLeftRight,
  UserCog,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

interface AdminSidebarProps {
  collapsed: boolean
  onToggle: () => void
  pendingTransfers: number
}

const navItems = [
  { path: '/dashboard', label: 'لوحة التحكم', icon: LayoutDashboard, end: true },
  { path: '/dashboard/mosques', label: 'المساجد', icon: Building2 },
  { path: '/dashboard/imams', label: 'الأئمة', icon: Users },
  { path: '/dashboard/transfers', label: 'بلاغات النقل', icon: ArrowLeftRight, hasBadge: true },
  { path: '/dashboard/users', label: 'المستخدمون', icon: UserCog },
]

export default function AdminSidebar({ collapsed, onToggle, pendingTransfers }: AdminSidebarProps) {
  return (
    <aside
      className={cn(
        'fixed top-0 right-0 z-40 flex h-screen flex-col border-l border-[#0a3d2a] bg-[#0d4b33] transition-all duration-300',
        collapsed ? 'w-[72px]' : 'w-64'
      )}
    >
      {/* Header / Brand */}
      <div className="relative flex h-16 items-center justify-center border-b border-[#c4a052]/20 px-4">
        {!collapsed && (
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#c4a052]/15">
              <LayoutDashboard className="h-4 w-4 text-[#c4a052]" />
            </div>
            <span className="whitespace-nowrap font-tajawal text-sm font-bold text-white/90">
              لوحة التحكم
            </span>
          </div>
        )}
        {collapsed && (
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#c4a052]/15">
            <LayoutDashboard className="h-4 w-4 text-[#c4a052]" />
          </div>
        )}
        {/* Subtle gold line under header */}
        <div className="absolute bottom-0 left-4 right-4 h-px bg-gradient-to-l from-transparent via-[#c4a052]/30 to-transparent" />
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.end}
            className={({ isActive }) =>
              cn(
                'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 font-tajawal text-sm transition-all duration-200',
                isActive
                  ? 'bg-white/10 text-white shadow-sm'
                  : 'text-white/60 hover:bg-white/[0.06] hover:text-white/90'
              )
            }
          >
            {({ isActive }) => (
              <>
                {/* Active indicator — gold bar on right edge */}
                {isActive && (
                  <div className="absolute -right-3 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-l-full bg-[#c4a052]" />
                )}

                <item.icon
                  className={cn(
                    'h-[18px] w-[18px] shrink-0 transition-colors',
                    isActive ? 'text-[#c4a052]' : 'text-white/40 group-hover:text-white/70'
                  )}
                />

                {!collapsed && (
                  <span className="flex-1 truncate">{item.label}</span>
                )}

                {/* Pending transfers badge */}
                {item.hasBadge && pendingTransfers > 0 && (
                  <Badge
                    className={cn(
                      'h-5 min-w-5 justify-center border-0 bg-[#c4a052] px-1.5 text-[10px] font-bold text-[#0d4b33]',
                      collapsed && 'absolute -left-1 -top-1'
                    )}
                  >
                    {pendingTransfers}
                  </Badge>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Collapse toggle */}
      <div className="border-t border-white/[0.06] p-3">
        <button
          onClick={onToggle}
          className="flex w-full items-center justify-center rounded-lg py-2 text-white/40 transition-colors hover:bg-white/[0.06] hover:text-white/70"
        >
          {collapsed ? (
            <ChevronsLeft className="h-4 w-4" />
          ) : (
            <ChevronsRight className="h-4 w-4" />
          )}
        </button>
      </div>
    </aside>
  )
}
