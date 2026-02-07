import { Link } from 'react-router-dom'

export function Footer() {
  return (
    <footer className="relative mt-16 overflow-hidden bg-primary-dark py-8 text-white">
      {/* Islamic pattern overlay */}
      <div className="islamic-pattern absolute inset-0 opacity-5" />

      <div className="container relative text-center">
        {/* Nav links */}
        <nav className="mb-4 flex items-center justify-center gap-4 text-sm">
          <Link to="/" className="text-white/70 transition-colors hover:text-white">
            الرئيسية
          </Link>
          <span className="text-white/30">|</span>
          <Link to="/about" className="text-white/70 transition-colors hover:text-white">
            عن الموقع
          </Link>
          <span className="text-white/30">|</span>
          <Link to="/request" className="text-white/70 transition-colors hover:text-white">
            إضافة طلب
          </Link>
          <span className="text-white/30">|</span>
          <Link to="/contact" className="text-white/70 transition-colors hover:text-white">
            تواصل معنا
          </Link>
          <span className="text-white/30">|</span>
          <Link to="/tracker" className="text-white/70 transition-colors hover:text-white">
            متابعة التراويح
          </Link>
        </nav>

        <div className="mx-auto mb-4 h-px w-48 bg-white/10" />

        <p className="text-sm text-white/70">
          موقع أئمة التراويح - رمضان ١٤٤٧ هـ
        </p>
      </div>
    </footer>
  )
}
