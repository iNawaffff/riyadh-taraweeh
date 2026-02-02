import { Helmet } from 'react-helmet-async'
import { Landmark, Heart, Search, Headphones, MapPin, Youtube, Quote } from 'lucide-react'

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}
import { formatArabicDate } from '@/lib/arabic-utils'

const FEATURES = [
  { icon: Search, text: 'البحث عن المساجد أو الأئمة بسهولة' },
  { icon: MapPin, text: 'تصفية المساجد حسب المنطقة والحي' },
  { icon: Headphones, text: 'الاستماع لعينات صوتية للأئمة' },
  { icon: Youtube, text: 'الوصول الى مقاطع اليوتيوب بأصوات الأئمة' },
  { icon: MapPin, text: 'الحصول على روابط مباشرة للمواقع على خرائط جوجل' },
  { icon: Heart, text: 'حفظ المساجد المفضلة ومتابعتها' },
]

export function AboutPage() {
  return (
    <>
      <Helmet><title>عن الموقع - أئمة التراويح</title></Helmet>

      <div className="container max-w-2xl py-8 md:py-12">
        {/* Page title */}
        <div className="mb-10 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-light">
            <Landmark className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">عن الموقع</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            دليل أئمة التراويح في مدينة الرياض
          </p>
        </div>

        {/* Developer card */}
        <section className="mb-8 overflow-hidden rounded-2xl ring-1 ring-primary/10">
          {/* Header */}
          <div className="bg-gradient-to-l from-primary to-primary-dark px-6 py-4">
            <p className="text-sm font-bold text-white/90">من المطور</p>
          </div>

          <div className="bg-gradient-to-bl from-primary/5 to-transparent p-6">
            {/* Quote */}
            <div className="relative mb-5">
              <Quote className="absolute -top-1 -start-1 h-8 w-8 text-primary/10" />
              <div className="space-y-3 ps-6">
                <p className="leading-7 text-foreground/80">
                  قمت بتطوير هذا الموقع كمبادرة شخصية لخدمة المجتمع خلال شهر رمضان المبارك.
                </p>
                <p className="leading-7 text-foreground/80">
                  هدفي من هذا المشروع هو تسهيل الوصول إلى المساجد ومعرفة أئمة التراويح في مدينة الرياض،
                  مما يساعد المصلين في اختيار المساجد التي تناسب احتياجاتهم وأذواقهم في القراءة والتلاوة.
                </p>
              </div>
            </div>

            {/* Signature */}
            <div className="flex items-center gap-4 border-t border-primary/10 pt-5">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
                ن
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">نواف المفدى</p>
                <a
                  href="https://twitter.com/iNawafkhalid"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-sky-500"
                >
                  <XIcon className="h-3 w-3" />
                  <span dir="ltr">@iNawafkhalid</span>
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Community */}
        <section className="mb-8">
          <h2 className="mb-3 text-lg font-bold text-foreground">مبادرة لخدمة المجتمع</h2>
          <p className="leading-7 text-foreground/80">
            جُمعت المعلومات في هذا الموقع من مصادر مختلفة، وأتقدم بالشكر الجزيل لكل من ساهم
            في توفير البيانات والمعلومات التي ساعدت في إثراء هذا الموقع. سيتم تحديث الموقع
            سنويًا في رمضان — بإذن الله — بمعلومات حديثة ودقيقة لمساعدة المصلين في اختيار
            المساجد المناسبة لصلاة التراويح.
          </p>
        </section>

        {/* Features */}
        <section className="mb-8">
          <h2 className="mb-4 text-lg font-bold text-foreground">مميزات الموقع</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {FEATURES.map((feature, i) => (
              <div
                key={i}
                className="flex items-start gap-3 rounded-xl bg-white p-4 ring-1 ring-border/50 transition-shadow hover:shadow-sm"
              >
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-light">
                  <feature.icon className="h-4 w-4 text-primary" />
                </div>
                <span className="text-sm leading-relaxed text-foreground/80">{feature.text}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Dua */}
        <div className="rounded-2xl bg-primary-light/50 px-6 py-5 text-center">
          <p className="text-base font-medium leading-7 text-primary-dark">
            ونسألكم الدعاء لنا ولوالدينا. نفع الله بهذا العمل وجعله في موازين الحسنات.
          </p>
        </div>

        {/* Last update */}
        <p className="mt-6 text-center text-xs text-muted-foreground">
          آخر تحديث: {formatArabicDate()}
        </p>
      </div>
    </>
  )
}
