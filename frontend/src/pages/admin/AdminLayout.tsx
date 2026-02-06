import { useState, useCallback } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { useAdminStats } from '@/hooks/use-admin'
import AdminSidebar from '@/components/admin/AdminSidebar'
import AdminHeader from '@/components/admin/AdminHeader'
import { cn } from '@/lib/utils'

const pageTitles: Record<string, string> = {
  '/dashboard': 'لوحة التحكم',
  '/dashboard/mosques': 'إدارة المساجد',
  '/dashboard/mosques/new': 'إضافة مسجد',
  '/dashboard/imams': 'إدارة الأئمة',
  '/dashboard/transfers': 'بلاغات النقل',
  '/dashboard/users': 'إدارة المستخدمين',
}

export default function AdminLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()
  const { data: stats } = useAdminStats()

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => !prev)
  }, [])

  const toggleMobile = useCallback(() => {
    setMobileOpen((prev) => !prev)
  }, [])

  // Determine page title from current path
  const basePath = location.pathname.replace(/\/\d+\/edit$/, '').replace(/\/new$/, location.pathname.includes('/new') ? '/new' : '')
  const title = pageTitles[basePath] || (location.pathname.includes('/edit') ? 'تعديل مسجد' : 'لوحة التحكم')

  return (
    <div className="min-h-screen bg-[#faf9f6] font-tajawal" dir="rtl">
      {/* Desktop sidebar */}
      <div className="hidden md:block">
        <AdminSidebar
          collapsed={sidebarCollapsed}
          onToggle={toggleSidebar}
          pendingTransfers={stats?.pending_transfers || 0}
        />
      </div>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
            onClick={toggleMobile}
          />
          <div className="md:hidden">
            <AdminSidebar
              collapsed={false}
              onToggle={toggleMobile}
              pendingTransfers={stats?.pending_transfers || 0}
            />
          </div>
        </>
      )}

      {/* Main content area */}
      <div
        className={cn(
          'min-h-screen transition-all duration-300',
          sidebarCollapsed ? 'md:mr-[72px]' : 'md:mr-64'
        )}
      >
        <AdminHeader
          title={title}
          onMenuToggle={toggleMobile}
          sidebarCollapsed={sidebarCollapsed}
        />

        <main className="p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
