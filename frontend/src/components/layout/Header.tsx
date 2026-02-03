import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Menu, Heart, LogIn } from 'lucide-react'
import { MobileMenu } from './MobileMenu'
import { useFavorites } from '@/hooks'
import { useAuth } from '@/hooks/use-auth'
import { LoginDialog, UserMenu, UsernameSetup } from '@/components/auth'
import { cn } from '@/lib/utils'

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isLoginOpen, setIsLoginOpen] = useState(false)
  const { favoritesCount } = useFavorites()
  const { isAuthenticated, isLoading } = useAuth()

  const toggleMenu = () => setIsMenuOpen(prev => !prev)
  const closeMenu = () => setIsMenuOpen(false)

  return (
    <>
      <header className="sticky top-0 z-40 bg-primary text-white shadow-md">
        {/* Islamic pattern overlay */}
        <div className="islamic-pattern absolute inset-0" />

        <div className="container relative py-3 md:py-4">
          {/* CSS Grid: 3-column layout for proper spacing in RTL */}
          <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2">
            {/* Hamburger Menu (right side in RTL) */}
            <button
              onClick={toggleMenu}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 backdrop-blur-sm transition-all hover:bg-white/20 active:scale-95"
              aria-label="فتح القائمة"
              aria-expanded={isMenuOpen}
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Logo (centered) */}
            <Link
              to="/"
              className="flex items-center justify-center gap-3"
              onClick={closeMenu}
            >
              <div className="flex items-center justify-center">
                <img
                  src="/static/images/animated-moon.gif"
                  alt="هلال رمضان"
                  width={40}
                  height={40}
                  className="object-contain"
                />
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-wide md:text-xl">
                  أئمة التراويح
                </h1>
                <p className="text-xs text-accent-light">
                  رمضان ١٤٤٧ هـ - الرياض
                </p>
              </div>
            </Link>

            {/* Action buttons (left side in RTL) */}
            <div className="flex items-center justify-end gap-1.5">
              {/* Auth button / User menu */}
              {!isLoading && (
                isAuthenticated ? (
                  <UserMenu />
                ) : (
                  <button
                    onClick={() => setIsLoginOpen(true)}
                    className="group relative flex h-9 items-center gap-1.5 overflow-hidden rounded-full border border-white/20 bg-gradient-to-l from-white/20 to-white/10 px-3.5 text-sm font-medium backdrop-blur-sm transition-all duration-300 hover:border-white/30 hover:from-white/25 hover:to-white/15 hover:shadow-[0_0_20px_rgba(255,255,255,0.15)] active:scale-95"
                  >
                    <LogIn className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-0.5" />
                    <span>تسجيل</span>
                  </button>
                )
              )}

              {/* Favorites button - always visible, acts as CTA when logged out */}
              <Link
                to={isAuthenticated ? "/favorites" : "#"}
                onClick={(e) => {
                  if (!isAuthenticated) {
                    e.preventDefault()
                    setIsLoginOpen(true)
                  }
                }}
                className={cn(
                  'relative flex h-9 items-center justify-center gap-1 rounded-full px-2.5 transition-all active:scale-95',
                  'bg-white/10 backdrop-blur-sm hover:bg-white/20',
                  favoritesCount > 0 && 'bg-white/15'
                )}
              >
                {favoritesCount > 0 && (
                  <span className="text-sm font-medium leading-none">{favoritesCount}</span>
                )}
                <Heart
                  className={cn(
                    'h-4 w-4 transition-all',
                    favoritesCount > 0
                      ? 'fill-red-400 text-red-400'
                      : 'text-white/80'
                  )}
                />
                {favoritesCount === 0 && (
                  <span className="hidden text-sm text-white/80 sm:inline">المفضلة</span>
                )}
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      <MobileMenu isOpen={isMenuOpen} onClose={closeMenu} />

      {/* Login Dialog */}
      <LoginDialog open={isLoginOpen} onOpenChange={setIsLoginOpen} />

      {/* Username Setup (first-time registration) */}
      <UsernameSetup />
    </>
  )
}
