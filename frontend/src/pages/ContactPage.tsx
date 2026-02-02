import { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Mail, Send, MessageSquare, Plus, ExternalLink } from 'lucide-react'

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}
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
    <section className="rounded-2xl bg-white p-6 ring-1 ring-border/50">
      <div className="mb-5 flex items-center gap-2">
        <Send className="h-4.5 w-4.5 text-primary" />
        <h2 className="text-base font-bold text-foreground">أرسل رسالة سريعة</h2>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground/70">الاسم</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="اسمك"
              className="h-11 bg-muted/30"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground/70">البريد الإلكتروني</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
              dir="ltr"
              className="h-11 bg-muted/30"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground/70">الرسالة</label>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="اكتب رسالتك هنا..."
            rows={4}
            required
            className="bg-muted/30"
          />
        </div>
        <Button type="submit" className="h-11 gap-2 rounded-xl">
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
      <Helmet><title>تواصل معنا - أئمة التراويح</title></Helmet>

      <div className="container max-w-2xl py-8 md:py-12">
        {/* Page title */}
        <div className="mb-10 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-light">
            <MessageSquare className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">تواصل معنا</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            يسعدنا تلقي اقتراحاتكم، ملاحظاتكم، أو استفساراتكم
          </p>
        </div>

        {/* Contact methods */}
        <div className="mb-8 grid gap-3 sm:grid-cols-2">
          <a
            href="mailto:info@taraweeh.org"
            className="group flex items-center gap-4 rounded-2xl bg-white p-5 ring-1 ring-border/50 transition-all hover:shadow-md hover:ring-primary/20"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-light transition-colors group-hover:bg-primary/10">
              <Mail className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground">البريد الإلكتروني</p>
              <p className="truncate text-sm font-semibold text-foreground" dir="ltr">info@taraweeh.org</p>
            </div>
            <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground/50" />
          </a>

          <a
            href="https://twitter.com/iNawafkhalid"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-4 rounded-2xl bg-white p-5 ring-1 ring-border/50 transition-all hover:shadow-md hover:ring-gray-300"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gray-100 transition-colors group-hover:bg-gray-200">
              <XIcon className="h-5 w-5 text-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground">تويتر</p>
              <p className="truncate text-sm font-semibold text-foreground" dir="ltr">@iNawafkhalid</p>
            </div>
            <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground/50" />
          </a>
        </div>

        {/* Suggest a mosque */}
        <section className="mb-8 rounded-2xl bg-gradient-to-bl from-accent/5 to-accent/[0.02] p-6 ring-1 ring-accent/15">
          <div className="mb-4 flex items-center gap-2">
            <Plus className="h-4.5 w-4.5 text-accent-foreground" />
            <h2 className="text-base font-bold text-foreground">اقتراح إضافة مسجد</h2>
          </div>
          <p className="mb-4 text-sm leading-7 text-foreground/80">
            إذا كنت ترغب في اقتراح إضافة مسجد أو إمام جديد، يرجى مراسلتنا عبر البريد الإلكتروني
            مع تضمين المعلومات التالية:
          </p>
          <ul className="mb-4 space-y-2">
            {SUBMISSION_ITEMS.map((item, i) => (
              <li key={i} className="flex items-center gap-2.5 text-sm text-foreground/80">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                {item}
              </li>
            ))}
          </ul>
          <p className="text-sm text-foreground/70">
            سنقوم بمراجعة اقتراحك وإضافته للموقع في أقرب وقت ممكن.
          </p>
        </section>

        {/* Contact form */}
        <div className="mb-8">
          <ContactForm />
        </div>

        {/* Dua */}
        <div className="rounded-2xl bg-primary-light/50 px-6 py-5 text-center">
          <p className="text-base font-medium leading-7 text-primary-dark">
            جزاكم الله خيراً على تعاونكم ومساهمتكم في إثراء هذا الموقع.
          </p>
        </div>
      </div>
    </>
  )
}
