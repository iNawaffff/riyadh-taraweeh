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

        <div className="container relative py-4">
          <div className="flex items-center">
            {/* Action buttons */}
            <div className="absolute end-0 top-1/2 -translate-y-1/2 z-50 flex items-center gap-2">
              {/* Auth button */}
              {!isLoading && (
                isAuthenticated ? (
                  <UserMenu />
                ) : (
                  <button
                    onClick={() => setIsLoginOpen(true)}
                    className="flex h-9 items-center gap-1.5 rounded-full bg-white/10 px-3 text-sm transition-all hover:bg-white/20"
                  >
                    <LogIn className="h-4 w-4" />
                    <span>دخول</span>
                  </button>
                )
              )}

              {/* Favorites indicator */}
              {isAuthenticated && (
                <Link
                  to="/favorites"
                  className={cn(
                    'relative flex h-9 w-9 items-center justify-center rounded-full',
                    'bg-white/10 transition-all duration-300',
                    'hover:bg-white/20'
                  )}
                  title={`${favoritesCount} مسجد في المفضلة`}
                >
                  <Heart className={cn('h-5 w-5', favoritesCount > 0 ? 'fill-red-400 text-red-400' : 'text-white/70')} />
                  {favoritesCount > 0 && (
                    <span
                      className={cn(
                        'absolute -top-1 -start-1 flex h-[18px] min-w-[18px] items-center justify-center',
                        'rounded-full bg-accent px-1 text-[10px] font-bold leading-none text-primary-dark'
                      )}
                    >
                      {favoritesCount}
                    </span>
                  )}
                </Link>
              )}

              {/* Hamburger Menu Button */}
              <button
                onClick={toggleMenu}
                className="rounded-full p-2 transition-all duration-200 hover:bg-white/10 active:scale-90"
                aria-label="فتح القائمة"
                aria-expanded={isMenuOpen}
              >
                <Menu className="h-6 w-6" />
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
