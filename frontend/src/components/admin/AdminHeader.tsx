import { Link } from 'react-router-dom'
import { Menu, ExternalLink, LogOut } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { ROLE_LABELS } from '@/lib/constants'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

interface AdminHeaderProps {
  title?: string
  onMenuToggle: () => void
  sidebarCollapsed: boolean
}

export default function AdminHeader({ title, onMenuToggle, sidebarCollapsed }: AdminHeaderProps) {
  const { user, signOut } = useAuth()

  return (
    <header
      className={cn(
        'sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-[#c4a052]/15 bg-white/80 px-4 backdrop-blur-md transition-all duration-300 md:px-6',
        sidebarCollapsed ? 'md:mr-[72px]' : 'md:mr-64'
      )}
    >
      {/* Gold accent line at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-l from-[#c4a052]/40 via-[#c4a052]/20 to-transparent" />

      {/* Mobile menu toggle */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onMenuToggle}
        className="shrink-0 text-[#0d4b33]/70 hover:bg-[#0d4b33]/5 hover:text-[#0d4b33] md:hidden"
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Page title */}
      {title && (
        <h1 className="font-tajawal text-lg font-bold text-[#0d4b33]">
          {title}
        </h1>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Back to public site */}
      <Link
        to="/"
        className="hidden items-center gap-1.5 font-tajawal text-xs text-[#0d4b33]/50 transition-colors hover:text-[#0d4b33] sm:flex"
      >
        <ExternalLink className="h-3.5 w-3.5" />
        العودة للموقع
      </Link>

      {/* Separator */}
      <div className="hidden h-6 w-px bg-[#0d4b33]/10 sm:block" />

      {/* User info */}
      <div className="flex items-center gap-3">
        <div className="hidden flex-col items-end sm:flex">
          <span className="font-tajawal text-sm font-medium text-[#0d4b33]">
            {user?.display_name || user?.username}
          </span>
          <span className="font-tajawal text-[10px] text-[#c4a052]">
            {ROLE_LABELS[user?.role || 'user']?.label || 'مستخدم'}
          </span>
        </div>

        <Avatar className="h-8 w-8 ring-2 ring-[#c4a052]/20 ring-offset-1">
          {user?.avatar_url ? (
            <AvatarImage src={user.avatar_url} alt={user.display_name || ''} />
          ) : null}
          <AvatarFallback className="bg-[#0d4b33] font-tajawal text-xs text-white">
            {(user?.display_name || user?.username || '?')[0]}
          </AvatarFallback>
        </Avatar>

        <Button
          variant="ghost"
          size="icon"
          onClick={signOut}
          className="h-8 w-8 text-[#0d4b33]/40 hover:bg-red-50 hover:text-red-500"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  )
}
