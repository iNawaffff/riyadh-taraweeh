import { Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading, isAuthenticated } = useAuth()

  if (isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[#faf9f6]" dir="rtl">
        <div className="flex flex-col items-center gap-6">
          {/* Geometric spinner inspired by Islamic star patterns */}
          <div className="relative h-16 w-16">
            <div className="absolute inset-0 rounded-full border-[3px] border-[#0d4b33]/10" />
            <div className="absolute inset-0 animate-spin rounded-full border-[3px] border-transparent border-t-[#c4a052]" />
            <div className="absolute inset-2 animate-spin rounded-full border-[2px] border-transparent border-b-[#0d4b33]" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
          </div>
          <p className="font-tajawal text-sm text-[#0d4b33]/60">جاري التحقق...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/" replace />
  }

  if (user.role !== 'admin' && user.role !== 'moderator') {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
