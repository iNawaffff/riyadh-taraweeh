import { Link } from 'react-router-dom'
import { LogOut, User, Calendar } from 'lucide-react'
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
        <button className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-white/10 transition-all hover:bg-white/20">
          {user.avatar_url ? (
            <img
              src={user.avatar_url}
              alt={user.display_name || user.username}
              className="h-full w-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <User className="h-5 w-5 text-white" />
          )}
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
