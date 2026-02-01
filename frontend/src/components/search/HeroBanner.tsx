import { Moon, Star } from 'lucide-react'
import { toArabicNum, getRamadanInfo } from '@/lib/arabic-utils'

export function HeroBanner() {
  const ramadan = getRamadanInfo()

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-primary to-primary-dark pb-10 pt-14 text-white md:pb-12 md:pt-20">
      {/* Islamic pattern overlay */}
      <div className="islamic-pattern-large absolute inset-0" />

      {/* Mosque silhouette decoration */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-[0.04]">
        <svg
          viewBox="0 0 800 200"
          className="absolute bottom-0 start-0 w-full"
          fill="currentColor"
        >
          <ellipse cx="400" cy="160" rx="120" ry="100" />
          <rect x="220" y="40" width="20" height="160" />
          <circle cx="230" cy="35" r="14" />
          <rect x="560" y="40" width="20" height="160" />
          <circle cx="570" cy="35" r="14" />
          <rect x="260" y="160" width="280" height="40" />
        </svg>
      </div>

      {/* Decorative stars */}
      <Star className="pointer-events-none absolute top-6 start-[10%] h-3 w-3 text-white/10 md:h-4 md:w-4" />
      <Star className="pointer-events-none absolute top-10 end-[15%] h-2.5 w-2.5 text-white/[0.07]" />
      <Star className="pointer-events-none absolute bottom-16 start-[25%] h-2 w-2 text-white/[0.08]" />

      <div className="container relative z-10">
        <h2 className="hero-fade-in mb-4 text-2xl font-bold drop-shadow-[0_2px_4px_rgba(0,0,0,0.15)] md:text-3xl">
          تصفح أشهر أئمة التراويح في الرياض
        </h2>
        <p className="hero-fade-in animation-delay-150 max-w-2xl text-base leading-relaxed text-white/85 md:text-lg">
          استمع لتلاوات الأئمة واختر المسجد الأقرب إليك لقضاء ليالي رمضان في خشوع وسكينة
        </p>

        {/* Ramadan countdown — inside the banner */}
        {ramadan.type === 'before' && (
          <div className="hero-fade-in animation-delay-150 mt-5 inline-flex items-center gap-2.5 rounded-full border border-white/20 bg-white/10 px-5 py-2.5 text-sm backdrop-blur-sm md:text-base">
            <Moon className="h-4 w-4 text-amber-300" />
            <span>باقي <strong className="text-amber-200">{toArabicNum(ramadan.daysUntil!)}</strong> يوم على بداية رمضان ١٤٤٧ هـ</span>
          </div>
        )}
        {ramadan.type === 'during' && (
          <div className="hero-fade-in animation-delay-150 mt-5 inline-flex items-center gap-2.5 rounded-full border border-white/20 bg-white/10 px-5 py-2.5 text-sm backdrop-blur-sm md:text-base">
            <Moon className="h-4 w-4 text-amber-300" />
            <span>الليلة <strong className="text-amber-200">{toArabicNum(ramadan.nightNum!)}</strong> من رمضان — باقي {toArabicNum(ramadan.daysLeft!)} يوم</span>
          </div>
        )}
      </div>
    </section>
  )
}
