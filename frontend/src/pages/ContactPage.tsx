import { useState } from 'react'
import { Mail, Twitter, ExternalLink, Send } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

const SUBMISSION_ITEMS = [
  'اسم المسجد',
  'موقع المسجد',
  'المنطقة',
  'رابط الموقع على خرائط جوجل (إن وجد)',
  'اسم الإمام',
  'رابط عينة صوتية للإمام (إن وجد)',
  'رابط قناة اليوتيوب للإمام (إن وجد)',
]

function ContactForm() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const subject = encodeURIComponent(`رسالة من ${name || 'زائر'} عبر موقع أئمة التراويح`)
    const body = encodeURIComponent(`الاسم: ${name}\nالبريد: ${email}\n\n${message}`)
    window.location.href = `mailto:info@taraweeh.org?subject=${subject}&body=${body}`
  }

  return (
    <section className="mb-8 rounded-xl border border-border bg-muted/30 p-6">
      <h2 className="relative mb-5 inline-block text-lg font-bold text-primary">
        أرسل رسالة سريعة
        <span className="absolute -bottom-2 start-0 h-0.5 w-12 bg-accent" />
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">الاسم</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="اسمك"
              className="h-11"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">البريد الإلكتروني</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
              dir="ltr"
              className="h-11"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">الرسالة</label>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="اكتب رسالتك هنا..."
            rows={4}
            required
          />
        </div>
        <Button type="submit" className="h-11 gap-2">
          <Send className="h-4 w-4" />
          إرسال
        </Button>
      </form>
    </section>
  )
}

export function ContactPage() {
  return (
    <>
      {/* Page Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary to-primary-dark py-10 text-white">
        <div className="islamic-pattern-large absolute inset-0" />
        <div className="container relative">
          <h1 className="flex items-center gap-3 text-2xl font-bold md:text-3xl">
            <Mail className="h-7 w-7 text-accent-light" aria-hidden="true" />
            تواصل معنا
          </h1>
        </div>
      </div>

      <div className="container py-6">
        <Card className="border-0 shadow-card">
          <CardContent className="p-6 md:p-8">
            {/* Welcome Section */}
            <section className="mb-8">
              <h2 className="relative mb-4 inline-block text-xl font-bold text-primary">
                نرحب بتواصلكم
                <span className="absolute -bottom-2 start-0 h-0.5 w-12 bg-accent" />
              </h2>
              <p className="leading-relaxed">
                يسعدنا تلقي اقتراحاتكم، ملاحظاتكم، أو استفساراتكم حول موقع أئمة التراويح.
                يمكنكم التواصل معنا عبر:
              </p>
            </section>

            {/* Contact Methods */}
            <div className="mb-8 space-y-4">
              {/* Email */}
              <div className="flex items-center gap-5 rounded-xl bg-primary-light p-5 transition-all duration-300 hover:-translate-y-0.5 hover:bg-accent-light">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white shadow-sm">
                  <Mail className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="mb-1 font-semibold text-primary">البريد الإلكتروني</h3>
                  <a
                    href="mailto:info@taraweeh.org"
                    className="inline-flex items-center gap-2 rounded-full border-2 border-primary-light bg-white px-4 py-2 text-primary-dark shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary hover:bg-primary-light hover:shadow-md"
                  >
                    <span>info@taraweeh.org</span>
                    <ExternalLink className="h-3.5 w-3.5 opacity-80" />
                  </a>
                </div>
              </div>

              {/* Twitter */}
              <div className="flex items-center gap-5 rounded-xl bg-primary-light p-5 transition-all duration-300 hover:-translate-y-0.5 hover:bg-accent-light">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white shadow-sm">
                  <Twitter className="h-6 w-6 text-twitter" />
                </div>
                <div className="flex-1">
                  <h3 className="mb-1 font-semibold text-primary">تويتر</h3>
                  <a
                    href="https://twitter.com/iNawafkhalid"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-full border-2 border-primary-light bg-white px-4 py-2 text-twitter shadow-sm transition-all hover:-translate-y-0.5 hover:border-twitter/30 hover:bg-blue-50 hover:shadow-md"
                  >
                    <span>@iNawafkhalid</span>
                    <ExternalLink className="h-3.5 w-3.5 opacity-80" />
                  </a>
                </div>
              </div>
            </div>

            {/* Add Mosque Section */}
            <section className="mb-8 rounded-xl border-s-4 border-accent bg-white p-6 shadow-card">
              {/* Info icon */}
              <div className="absolute -top-4 end-5 flex h-10 w-10 items-center justify-center rounded-full bg-accent shadow-sm">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-5 w-5"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 16v-4" />
                  <path d="M12 8h.01" />
                </svg>
              </div>

              <h2 className="relative mb-5 inline-block text-lg font-bold text-primary">
                اقتراح إضافة مسجد
                <span className="absolute -bottom-2 start-0 h-0.5 w-12 bg-accent" />
              </h2>

              <p className="mb-4 leading-relaxed">
                إذا كنت ترغب في اقتراح إضافة مسجد أو إمام جديد، يرجى مراسلتنا عبر البريد الإلكتروني
                مع تضمين المعلومات التالية:
              </p>

              <ul className="mb-4 space-y-2 pe-6">
                {SUBMISSION_ITEMS.map((item, index) => (
                  <li key={index} className="relative pe-4">
                    <span
                      className="absolute end-0 top-2 h-1.5 w-1.5 rounded-full bg-accent"
                      aria-hidden="true"
                    />
                    {item}
                  </li>
                ))}
              </ul>

              <p className="leading-relaxed">
                سنقوم بمراجعة اقتراحك وإضافته للموقع في أقرب وقت ممكن.
              </p>
            </section>

            {/* Quick Contact Form */}
            <ContactForm />

            {/* Dua */}
            <div className="text-center">
              <p className="text-lg font-medium italic text-primary-dark">
                جزاكم الله خيراً على تعاونكم ومساهمتكم في إثراء هذا الموقع.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
