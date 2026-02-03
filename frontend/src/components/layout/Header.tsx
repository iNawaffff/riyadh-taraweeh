import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Menu, Heart } from 'lucide-react'
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

        <div className="container relative py-4">
          <div className="flex items-center">
            {/* Action buttons */}
            <div className="absolute end-0 top-1/2 -translate-y-1/2 z-50 flex items-center gap-1.5">
              {/* Auth button / User menu */}
              {!isLoading && (
                isAuthenticated ? (
                  <UserMenu />
                ) : (
                  <button
                    onClick={() => setIsLoginOpen(true)}
                    className="flex h-9 items-center gap-1.5 rounded-full bg-white/15 px-3.5 text-sm font-medium backdrop-blur-sm transition-all hover:bg-white/25 active:scale-95"
                  >
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
                  'relative flex h-9 items-center gap-1.5 rounded-full px-3 transition-all active:scale-95',
                  'bg-white/10 backdrop-blur-sm hover:bg-white/20',
                  favoritesCount > 0 && 'bg-white/15'
                )}
              >
                <Heart
                  className={cn(
                    'h-4 w-4 transition-all',
                    favoritesCount > 0
                      ? 'fill-red-400 text-red-400'
                      : 'text-white/80'
                  )}
                />
                {favoritesCount > 0 ? (
                  <span className="text-sm font-medium">{favoritesCount}</span>
                ) : (
                  <span className="text-sm text-white/80">المفضلة</span>
                )}
              </Link>

              {/* Hamburger Menu Button */}
              <button
                onClick={toggleMenu}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 backdrop-blur-sm transition-all hover:bg-white/20 active:scale-95"
                aria-label="فتح القائمة"
                aria-expanded={isMenuOpen}
              >
                <Menu className="h-5 w-5" />
              </button>
            </div>

            {/* Logo */}
            <Link
              to="/"
              className="mx-auto flex items-center gap-4 pe-8"
              onClick={closeMenu}
            >
              {/* Animated Moon */}
              <div className="flex items-center justify-center">
                <img
                  src="/static/images/animated-moon.gif"
                  alt="هلال رمضان"
                  width={40}
                  height={40}
                  className="object-contain"
                />
              </div>

              {/* Site Title */}
              <div>
                <h1 className="text-lg font-bold tracking-wide md:text-xl">
                  أئمة التراويح
                </h1>
                <p className="text-xs text-accent-light">
                  رمضان ١٤٤٧ هـ - الرياض
                </p>
              </div>
            </Link>
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
