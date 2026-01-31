import { Info, Check } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { formatArabicDate } from '@/lib/arabic-utils'

const FEATURES = [
  'البحث عن المساجد أو الأئمة بسهولة',
  'تصفية المساجد حسب المنطقة',
  'الاستماع لعينات صوتية للأئمة',
  'الوصول الى مقاطع اليوتيوب بأصوات بالأئمة',
  'الحصول على روابط مباشرة للمواقع على خرائط جوجل',
]

export function AboutPage() {
  return (
    <>
      {/* Page Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary to-primary-dark py-10 text-white">
        <div className="islamic-pattern-large absolute inset-0" />
        <div className="container relative">
          <h1 className="flex items-center gap-3 text-2xl font-bold md:text-3xl">
            <Info className="h-7 w-7 text-accent-light" aria-hidden="true" />
            عن الموقع
          </h1>
        </div>
      </div>

      <div className="container py-6">
        <Card className="border-0 shadow-card">
          <CardContent className="p-6 md:p-8">
            {/* Author Introduction */}
            <div className="relative mb-8 overflow-hidden rounded-xl border-e-[3px] border-accent bg-primary-light p-6 shadow-sm">
              {/* Decorative gradient */}
              <div className="absolute inset-y-0 start-0 w-1 bg-gradient-to-b from-accent to-primary opacity-50" />
              <div className="islamic-pattern-large absolute inset-0" />

              <div className="relative">
                <h2 className="relative mb-4 inline-block text-xl font-bold text-primary-dark">
                  من المطور
                  <span className="absolute -bottom-2 start-0 h-0.5 w-12 bg-accent" />
                </h2>

                <p className="mb-4 leading-relaxed">
                  قمت بتطوير هذا الموقع كمبادرة شخصية لخدمة المجتمع خلال شهر رمضان المبارك.
                </p>
                <p className="mb-6 leading-relaxed">
                  هدفي من هذا المشروع هو تسهيل الوصول إلى المساجد ومعرفة أئمة التراويح في مدينة الرياض،
                  مما يساعد المصلين في اختيار المساجد التي تناسب احتياجاتهم وأذواقهم في القراءة والتلاوة.
                </p>

                {/* Developer signature */}
                <p className="text-start">
                  <span className="inline-block border-e-[3px] border-accent pe-4 text-lg font-semibold text-primary-dark">
                    نواف المفدى
                  </span>
                </p>
              </div>
            </div>

            {/* Community Initiative */}
            <section className="mb-8">
              <h2 className="relative mb-4 inline-block text-xl font-bold text-primary">
                مبادرة لخدمة المجتمع
                <span className="absolute -bottom-2 start-0 h-0.5 w-12 bg-accent" />
              </h2>
              <p className="leading-relaxed">
                جُمعت المعلومات في هذا الموقع من مصادر مختلفة، وأتقدم بالشكر الجزيل لكل من ساهم
                في توفير البيانات والمعلومات التي ساعدت في إثراء هذا الموقع. سيتم تحديث الموقع
                سنويًا في رمضان - بإذن الله - بمعلومات حديثة ودقيقة لمساعدة المصلين في اختيار
                المساجد المناسبة لصلاة التراويح.
              </p>
            </section>

            {/* Features */}
            <section className="mb-8">
              <h2 className="relative mb-4 inline-block text-xl font-bold text-primary">
                مميزات الموقع
                <span className="absolute -bottom-2 start-0 h-0.5 w-12 bg-accent" />
              </h2>
              <ul className="space-y-3 pe-6">
                {FEATURES.map((feature, index) => (
                  <li key={index} className="relative pe-6">
                    <Check
                      className="absolute end-0 top-0.5 h-4 w-4 text-accent"
                      aria-hidden="true"
                    />
                    {feature}
                  </li>
                ))}
              </ul>
            </section>

            {/* Dua */}
            <div className="mt-8 border-t border-dashed border-border pt-6 text-center">
              <p className="text-lg font-medium italic text-primary-dark">
                ونسألكم الدعاء لنا ولوالدينا. نفع الله بهذا العمل وجعله في موازين الحسنات.
              </p>
            </div>

            {/* Last Update */}
            <div className="mt-6 text-center">
              <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <span>آخر تحديث:</span>
                <span id="lastUpdateDate">{formatArabicDate()}</span>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
