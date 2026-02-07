import { Link } from 'react-router-dom'
import { LogOut, User, Calendar, ChevronDown, FileText } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuth } from '@/hooks/use-auth'

export function UserMenu() {
  const { user, signOut } = useAuth()

  if (!user) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex h-9 items-center gap-1 rounded-full bg-white/15 pe-2 ps-1 backdrop-blur-sm transition-all hover:bg-white/25 active:scale-95 sm:gap-1.5 sm:pe-2.5">
          <div className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-white/20">
            {user.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={user.display_name || user.username}
                className="h-full w-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <User className="h-4 w-4 text-white" />
            )}
          </div>
          {/* Hide name on mobile, show only avatar */}
          <span className="hidden max-w-[72px] truncate text-sm font-medium sm:inline">
            {user.display_name || user.username}
          </span>
          <ChevronDown className="h-3.5 w-3.5 text-white/60" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        <DropdownMenuItem asChild>
          <Link to={`/u/${user.username}`} className="gap-2">
            <User className="h-4 w-4" />
            ملفي الشخصي
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/tracker" className="gap-2">
            <Calendar className="h-4 w-4" />
            متابعة التراويح
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/my-requests" className="gap-2">
            <FileText className="h-4 w-4" />
            طلباتي
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => signOut()}
          className="gap-2 text-red-600 focus:text-red-600"
        >
          <LogOut className="h-4 w-4" />
          تسجيل الخروج
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
