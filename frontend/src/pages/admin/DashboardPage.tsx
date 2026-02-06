import { Building2, Users, UserCog, ArrowLeftRight } from 'lucide-react'
import { useAdminStats } from '@/hooks/use-admin'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

const statCards = [
  {
    key: 'mosque_count' as const,
    label: 'عدد المساجد',
    icon: Building2,
    gradient: 'from-[#0d4b33] to-[#156b49]',
    iconBg: 'bg-white/20',
    glow: 'shadow-[#0d4b33]/10',
  },
  {
    key: 'imam_count' as const,
    label: 'عدد الأئمة',
    icon: Users,
    gradient: 'from-[#1e4a7a] to-[#2a6cb0]',
    iconBg: 'bg-white/20',
    glow: 'shadow-[#1e4a7a]/10',
  },
  {
    key: 'user_count' as const,
    label: 'عدد المستخدمين',
    icon: UserCog,
    gradient: 'from-[#5b3a8c] to-[#7b52b5]',
    iconBg: 'bg-white/20',
    glow: 'shadow-[#5b3a8c]/10',
  },
  {
    key: 'pending_transfers' as const,
    label: 'بلاغات معلقة',
    icon: ArrowLeftRight,
    gradient: 'from-[#8a6914] to-[#c4a052]',
    iconBg: 'bg-white/20',
    glow: 'shadow-[#c4a052]/10',
  },
]

export default function DashboardPage() {
  const { data: stats, isLoading } = useAdminStats()

  return (
    <div className="space-y-8">
      {/* Welcome section */}
      <div>
        <h2 className="font-tajawal text-2xl font-bold text-[#0d4b33]">مرحباً بك</h2>
        <p className="mt-1 font-tajawal text-sm text-[#0d4b33]/50">
          نظرة عامة على إحصائيات الموقع
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card, index) => (
          <div
            key={card.key}
            className={cn(
              'group relative overflow-hidden rounded-2xl bg-gradient-to-bl p-5 text-white shadow-lg transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl',
              card.gradient,
              card.glow
            )}
            style={{ animationDelay: `${index * 80}ms` }}
          >
            {/* Decorative geometric pattern — subtle Islamic star overlay */}
            <div className="absolute -left-4 -top-4 h-24 w-24 rounded-full bg-white/[0.04]" />
            <div className="absolute -bottom-6 -right-6 h-32 w-32 rounded-full bg-white/[0.03]" />

            <div className="relative flex items-start justify-between">
              <div className="space-y-3">
                {isLoading ? (
                  <>
                    <Skeleton className="h-10 w-20 bg-white/20" shimmer={false} />
                    <Skeleton className="h-4 w-16 bg-white/10" shimmer={false} />
                  </>
                ) : (
                  <>
                    <p className="font-tajawal text-4xl font-extrabold tracking-tight">
                      {stats?.[card.key]?.toLocaleString('ar-SA') ?? '—'}
                    </p>
                    <p className="font-tajawal text-sm font-medium text-white/70">
                      {card.label}
                    </p>
                  </>
                )}
              </div>

              <div className={cn('rounded-xl p-2.5', card.iconBg)}>
                <card.icon className="h-5 w-5 text-white/80" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick info */}
      <div className="rounded-2xl border border-[#0d4b33]/5 bg-white p-6 shadow-sm">
        <h3 className="font-tajawal text-base font-bold text-[#0d4b33]">ملاحظات</h3>
        <ul className="mt-3 space-y-2 font-tajawal text-sm text-[#0d4b33]/60">
          <li className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-[#c4a052]" />
            يمكنك إدارة المساجد والأئمة من القائمة الجانبية
          </li>
          <li className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-[#c4a052]" />
            راجع بلاغات النقل المعلقة واعتمدها أو ارفضها
          </li>
          <li className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-[#c4a052]" />
            لوحة الإدارة القديمة لا تزال متاحة على /admin
          </li>
        </ul>
      </div>
    </div>
  )
}
