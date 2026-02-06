import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { HelmetProvider } from 'react-helmet-async'
import * as Sentry from '@sentry/react'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AudioProvider } from '@/context/AudioContext'
import { AuthProvider } from '@/context/AuthContext'
import { FavoritesProvider } from '@/context/FavoritesContext'
import { Layout } from '@/components/layout'
import { FloatingAudioPlayer } from '@/components/audio'
import { BaseStructuredData } from '@/components/seo'
import { ErrorFallback } from '@/components/ErrorFallback'
import { PageLoader } from '@/components/PageLoader'

// Lazy load pages for code splitting
const HomePage = lazy(() => import('@/pages/HomePage').then(m => ({ default: m.HomePage })))
const MosqueDetailPage = lazy(() => import('@/pages/MosqueDetailPage').then(m => ({ default: m.MosqueDetailPage })))
const AboutPage = lazy(() => import('@/pages/AboutPage').then(m => ({ default: m.AboutPage })))
const ContactPage = lazy(() => import('@/pages/ContactPage').then(m => ({ default: m.ContactPage })))
const FavoritesPage = lazy(() => import('@/pages/FavoritesPage').then(m => ({ default: m.FavoritesPage })))
const TrackerPage = lazy(() => import('@/pages/TrackerPage').then(m => ({ default: m.TrackerPage })))
const ProfilePage = lazy(() => import('@/pages/ProfilePage').then(m => ({ default: m.ProfilePage })))
const LeaderboardPage = lazy(() => import('@/pages/LeaderboardPage').then(m => ({ default: m.LeaderboardPage })))
const MapPage = lazy(() => import('@/pages/MapPage').then(m => ({ default: m.MapPage })))
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage').then(m => ({ default: m.NotFoundPage })))
const MakkahSchedulePage = lazy(() => import('@/pages/MakkahSchedulePage').then(m => ({ default: m.MakkahSchedulePage })))

// Admin pages (lazy-loaded, separate chunk)
const AdminLayout = lazy(() => import('@/pages/admin/AdminLayout'))
const DashboardPage = lazy(() => import('@/pages/admin/DashboardPage'))
const MosquesPage = lazy(() => import('@/pages/admin/MosquesPage'))
const MosqueFormPage = lazy(() => import('@/pages/admin/MosqueFormPage'))
const ImamsPage = lazy(() => import('@/pages/admin/ImamsPage'))
const TransfersPage = lazy(() => import('@/pages/admin/TransfersPage'))
const UsersPage = lazy(() => import('@/pages/admin/UsersPage'))
const AdminGuard = lazy(() => import('@/components/admin/AdminGuard'))

// Create a client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 30 * 60 * 1000, // 30 minutes
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
})

function App() {
  return (
    <Sentry.ErrorBoundary fallback={({ error, resetError }) => (
      <ErrorFallback error={error instanceof Error ? error : undefined} resetError={resetError} />
    )}>
      <HelmetProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
          <FavoritesProvider>
            <AudioProvider>
              <TooltipProvider delayDuration={300}>
              <BrowserRouter>
              {/* Base structured data for all pages */}
              <BaseStructuredData />

              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/" element={<Layout />}>
                    <Route index element={<HomePage />} />
                    <Route path="mosque/:id" element={<MosqueDetailPage />} />
                    <Route path="favorites" element={<FavoritesPage />} />
                    <Route path="leaderboard" element={<LeaderboardPage />} />
                    <Route path="map" element={<MapPage />} />
                    <Route path="tracker" element={<TrackerPage />} />
                    <Route path="about" element={<AboutPage />} />
                    <Route path="contact" element={<ContactPage />} />
                    <Route path="makkah" element={<MakkahSchedulePage />} />
                    <Route path="u/:username" element={<ProfilePage />} />
                    <Route path="*" element={<NotFoundPage />} />
                  </Route>

                  {/* Admin dashboard routes */}
                  <Route
                    path="/dashboard"
                    element={
                      <AdminGuard>
                        <AdminLayout />
                      </AdminGuard>
                    }
                  >
                    <Route index element={<DashboardPage />} />
                    <Route path="mosques" element={<MosquesPage />} />
                    <Route path="mosques/new" element={<MosqueFormPage />} />
                    <Route path="mosques/:id/edit" element={<MosqueFormPage />} />
                    <Route path="imams" element={<ImamsPage />} />
                    <Route path="transfers" element={<TransfersPage />} />
                    <Route path="users" element={<UsersPage />} />
                  </Route>
                </Routes>
              </Suspense>

              {/* Floating audio player */}
              <FloatingAudioPlayer />

              {/* Toast notifications */}
              <Toaster position="top-center" />
              </BrowserRouter>
              </TooltipProvider>
            </AudioProvider>
          </FavoritesProvider>
          </AuthProvider>
        </QueryClientProvider>
      </HelmetProvider>
    </Sentry.ErrorBoundary>
  )
}

export default App
