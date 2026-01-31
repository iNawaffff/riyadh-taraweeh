import { Outlet } from 'react-router-dom'
import { Header } from './Header'
import { Footer } from './Footer'
import { ScrollToTop } from './ScrollToTop'
import { ScrollRestoration } from './ScrollRestoration'

export function Layout() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Scroll restoration on navigation */}
      <ScrollRestoration />

      {/* Skip to content link for accessibility */}
      <a
        href="#main-content"
        className="skip-link"
      >
        تخطي إلى المحتوى الرئيسي
      </a>

      <Header />

      <main id="main-content" className="flex-1">
        <Outlet />
      </main>

      <Footer />

      {/* Scroll to top button */}
      <ScrollToTop />
    </div>
  )
}
