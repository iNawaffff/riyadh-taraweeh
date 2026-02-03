import { useState, useEffect, useCallback, useRef } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'
import { useAuth } from '@/hooks/use-auth'
import { useMediaQuery } from '@/hooks/use-media-query'
import { resetRecaptcha } from '@/lib/firebase'
import { Phone, ArrowRight, Moon, Loader2, AlertCircle, Sparkles } from 'lucide-react'
import type { ConfirmationResult } from 'firebase/auth'

interface LoginDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const FIREBASE_ERROR_MAP: Record<string, string> = {
  'auth/invalid-phone-number': 'رقم الهاتف غير صحيح',
  'auth/too-many-requests': 'محاولات كثيرة، حاول لاحقاً',
  'auth/invalid-verification-code': 'رمز التحقق غير صحيح',
  'auth/code-expired': 'انتهت صلاحية الرمز، أعد الإرسال',
  'auth/billing-not-enabled': 'خدمة الرسائل غير مفعّلة',
}

function getFirebaseError(e: unknown): string {
  console.error('Firebase auth error:', e)
  if (e && typeof e === 'object' && 'code' in e) {
    const code = (e as { code: string }).code
    return FIREBASE_ERROR_MAP[code] || `حدث خطأ: ${code}`
  }
  return 'حدث خطأ، حاول مرة أخرى'
}

/**
 * Normalize Saudi phone input to 9-digit format (5XXXXXXXX)
 * Handles: 05XXXXXXXX, 5XXXXXXXX, 00966..., +966..., spaces, dashes
 */
function normalizeSaudiPhone(input: string): string {
  // Remove all non-digits
  let digits = input.replace(/\D/g, '')

  // Remove country code prefixes
  if (digits.startsWith('00966')) {
    digits = digits.slice(5)
  } else if (digits.startsWith('966')) {
    digits = digits.slice(3)
  }

  // Remove leading 0 (e.g., 05... → 5...)
  if (digits.startsWith('0')) {
    digits = digits.slice(1)
  }

  // Limit to 9 digits
  return digits.slice(0, 9)
}

/**
 * Format phone for display: 5XX XXX XXXX
 */
function formatPhoneDisplay(digits: string): string {
  if (digits.length <= 3) return digits
  if (digits.length <= 6) return `${digits.slice(0, 3)} ${digits.slice(3)}`
  return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`
}

const toArabicNum = (n: number) => n.toString().replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[+d])

export function LoginDialog({ open, onOpenChange }: LoginDialogProps) {
  const { signInWithGoogle, signInWithPhone, confirmOtp } = useAuth()
  const isDesktop = useMediaQuery('(min-width: 768px)')
  const [mode, setMode] = useState<'main' | 'phone' | 'otp'>('main')
  const [phoneDigits, setPhoneDigits] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [confirmResult, setConfirmResult] = useState<ConfirmationResult | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const phoneInputRef = useRef<HTMLInputElement>(null)
  const [animatingOut, setAnimatingOut] = useState(false)

  // Countdown timer for OTP resend
  useEffect(() => {
    if (countdown <= 0) return
    const timer = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [countdown])

  // Focus phone input when entering phone mode
  useEffect(() => {
    if (mode === 'phone' && phoneInputRef.current) {
      setTimeout(() => phoneInputRef.current?.focus(), 100)
    }
  }, [mode])

  const resetState = useCallback(() => {
    setMode('main')
    setPhoneDigits('')
    setOtpCode('')
    setConfirmResult(null)
    setError('')
    setLoading(false)
    setCountdown(0)
    setAnimatingOut(false)
    resetRecaptcha()
  }, [])

  const transitionTo = (newMode: 'main' | 'phone' | 'otp') => {
    setAnimatingOut(true)
    setError('')
    setTimeout(() => {
      setMode(newMode)
      setAnimatingOut(false)
    }, 150)
  }

  const handleGoogleSignIn = async () => {
    setLoading(true)
    setError('')
    try {
      await signInWithGoogle()
      onOpenChange(false)
    } catch (e) {
      setError(getFirebaseError(e))
    } finally {
      setLoading(false)
    }
  }

  const fullPhone = `+966${phoneDigits}`

  const handlePhoneChange = (input: string) => {
    const normalized = normalizeSaudiPhone(input)
    setPhoneDigits(normalized)
    if (error) setError('')
  }

  const handleSendOtp = async () => {
    if (phoneDigits.length !== 9 || !phoneDigits.startsWith('5')) {
      setError('أدخل رقم جوال صحيح يبدأ بـ ٥')
      return
    }
    setLoading(true)
    setError('')
    try {
      const result = await signInWithPhone(fullPhone, 'recaptcha-container')
      setConfirmResult(result)
      transitionTo('otp')
      setCountdown(30)
    } catch (e) {
      setError(getFirebaseError(e))
    } finally {
      setLoading(false)
    }
  }

  const handleResendOtp = async () => {
    setLoading(true)
    setError('')
    setOtpCode('')
    try {
      const result = await signInWithPhone(fullPhone, 'recaptcha-container')
      setConfirmResult(result)
      setCountdown(30)
    } catch (e) {
      setError(getFirebaseError(e))
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmOtp = async (code: string) => {
    if (!confirmResult || code.length !== 6) return
    setLoading(true)
    setError('')
    try {
      await confirmOtp(confirmResult, code)
      onOpenChange(false)
    } catch (e) {
      setError(getFirebaseError(e))
      setOtpCode('')
    } finally {
      setLoading(false)
    }
  }

  const isPhoneValid = phoneDigits.length === 9 && phoneDigits.startsWith('5')

  const content = (
    <div
      className={`relative overflow-hidden transition-opacity duration-150 ${animatingOut ? 'opacity-0' : 'opacity-100'}`}
      dir="rtl"
    >
      {/* Decorative background pattern */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.03]">
        <div className="absolute -start-8 -top-8 h-32 w-32 rounded-full border-[16px] border-primary" />
        <div className="absolute -bottom-4 -end-4 h-24 w-24 rounded-full border-[12px] border-accent" />
      </div>

      <div className="relative space-y-6 px-1 pb-2">
        {/* Branded header */}
        <div className="flex flex-col items-center gap-3 pt-2">
          <div className="relative">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary-dark shadow-lg shadow-primary/20">
              <Moon className="h-8 w-8 text-white" strokeWidth={1.5} />
            </div>
            <Sparkles className="absolute -end-1 -top-1 h-5 w-5 text-accent" />
          </div>
          <div className="text-center">
            <h2 className="text-xl font-bold text-foreground">أهلاً بك</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">في أئمة التراويح</p>
          </div>
        </div>

        {/* Error state */}
        {error && (
          <div className="flex items-center gap-2.5 rounded-xl bg-destructive/10 p-3 text-destructive animate-in fade-in slide-in-from-top-2 duration-200">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        {/* Main mode */}
        {mode === 'main' && (
          <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <Button
              variant="outline"
              className="group h-14 w-full justify-start gap-3 rounded-xl border-2 px-4 text-base font-medium transition-all hover:border-primary/30 hover:bg-primary/5"
              onClick={handleGoogleSignIn}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white shadow-sm ring-1 ring-border/50">
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                </div>
              )}
              <span>المتابعة بحساب Google</span>
            </Button>

            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-dashed" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-background px-3 text-xs text-muted-foreground">أو</span>
              </div>
            </div>

            <Button
              variant="outline"
              className="group h-14 w-full justify-start gap-3 rounded-xl border-2 px-4 text-base font-medium transition-all hover:border-primary/30 hover:bg-primary/5"
              onClick={() => transitionTo('phone')}
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-white">
                <Phone className="h-5 w-5" />
              </div>
              <span>المتابعة برقم الجوال</span>
            </Button>
          </div>
        )}

        {/* Phone mode */}
        {mode === 'phone' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">رقم الجوال</label>
              <div className="flex items-stretch gap-2" dir="ltr">
                <div className="flex items-center justify-center rounded-xl border-2 border-primary/20 bg-primary/5 px-3 text-sm font-bold text-primary">
                  <span className="text-base">966+</span>
                </div>
                <div className="relative flex-1">
                  <Input
                    ref={phoneInputRef}
                    dir="ltr"
                    type="tel"
                    inputMode="numeric"
                    value={formatPhoneDisplay(phoneDigits)}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && isPhoneValid && handleSendOtp()}
                    placeholder="5XX XXX XXXX"
                    className="h-14 rounded-xl border-2 pe-12 text-center text-lg font-medium tracking-wider transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                  {phoneDigits.length > 0 && (
                    <div className="absolute end-3 top-1/2 -translate-y-1/2">
                      <span className={`text-xs font-medium ${isPhoneValid ? 'text-primary' : 'text-muted-foreground'}`}>
                        {toArabicNum(phoneDigits.length)}/٩
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <p className="text-center text-xs text-muted-foreground">
                يمكنك كتابة الرقم بأي صيغة (05... أو 5...)
              </p>
            </div>

            <Button
              className="h-14 w-full rounded-xl text-base font-bold shadow-lg shadow-primary/20 transition-all hover:shadow-xl hover:shadow-primary/30 disabled:shadow-none"
              onClick={handleSendOtp}
              disabled={loading || !isPhoneValid}
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="me-2">جارٍ الإرسال...</span>
                </>
              ) : (
                'إرسال رمز التحقق'
              )}
            </Button>

            <button
              type="button"
              className="flex w-full items-center justify-center gap-1.5 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
              onClick={() => transitionTo('main')}
            >
              <ArrowRight className="h-4 w-4" />
              <span>رجوع</span>
            </button>
          </div>
        )}

        {/* OTP mode */}
        {mode === 'otp' && (
          <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                أدخل رمز التحقق المرسل إلى
              </p>
              <p dir="ltr" className="mt-1 text-base font-bold text-foreground tracking-wide">
                +966 {formatPhoneDisplay(phoneDigits)}
              </p>
            </div>

            <div className="flex justify-center py-2" dir="ltr">
              <InputOTP
                maxLength={6}
                value={otpCode}
                onChange={(val) => {
                  setOtpCode(val)
                  if (val.length === 6) handleConfirmOtp(val)
                }}
                disabled={loading}
                className="gap-2"
              >
                <InputOTPGroup className="gap-2">
                  {[0, 1, 2].map(i => (
                    <InputOTPSlot
                      key={i}
                      index={i}
                      className="h-14 w-12 rounded-xl border-2 text-xl font-bold transition-all data-[active=true]:border-primary data-[active=true]:ring-2 data-[active=true]:ring-primary/20"
                    />
                  ))}
                </InputOTPGroup>
                <div className="flex items-center text-muted-foreground/30">
                  <span className="text-2xl">—</span>
                </div>
                <InputOTPGroup className="gap-2">
                  {[3, 4, 5].map(i => (
                    <InputOTPSlot
                      key={i}
                      index={i}
                      className="h-14 w-12 rounded-xl border-2 text-xl font-bold transition-all data-[active=true]:border-primary data-[active=true]:ring-2 data-[active=true]:ring-primary/20"
                    />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </div>

            <Button
              className="h-14 w-full rounded-xl text-base font-bold shadow-lg shadow-primary/20 transition-all hover:shadow-xl hover:shadow-primary/30 disabled:shadow-none"
              onClick={() => handleConfirmOtp(otpCode)}
              disabled={loading || otpCode.length !== 6}
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="me-2">جارٍ التحقق...</span>
                </>
              ) : (
                'تأكيد'
              )}
            </Button>

            <div className="text-center">
              {countdown > 0 ? (
                <p className="text-sm text-muted-foreground">
                  إعادة الإرسال خلال{' '}
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-muted font-bold text-foreground">
                    {toArabicNum(countdown)}
                  </span>
                </p>
              ) : (
                <button
                  type="button"
                  className="text-sm font-medium text-primary transition-colors hover:text-primary-dark disabled:opacity-50"
                  onClick={handleResendOtp}
                  disabled={loading}
                >
                  إعادة إرسال الرمز
                </button>
              )}
            </div>

            <button
              type="button"
              className="flex w-full items-center justify-center gap-1.5 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
              onClick={() => { setOtpCode(''); transitionTo('phone') }}
            >
              <ArrowRight className="h-4 w-4" />
              <span>تغيير الرقم</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )

  if (isDesktop) {
    return (
      <>
        <Dialog open={open} onOpenChange={(o) => { if (!o) resetState(); onOpenChange(o) }}>
          <DialogContent className="max-w-[420px] gap-0 overflow-hidden rounded-2xl p-6" dir="rtl">
            <DialogHeader>
              <DialogTitle className="sr-only">تسجيل الدخول</DialogTitle>
            </DialogHeader>
            {content}
          </DialogContent>
        </Dialog>
        <div id="recaptcha-container" />
      </>
    )
  }

  return (
    <>
      <Drawer open={open} onOpenChange={(o) => { if (!o) resetState(); onOpenChange(o) }}>
        <DrawerContent className="rounded-t-3xl">
          <DrawerHeader className="pb-0">
            <DrawerTitle className="sr-only">تسجيل الدخول</DrawerTitle>
          </DrawerHeader>
          <div className="mx-auto w-full max-w-[420px] px-5 pb-8 pt-2">
            {content}
          </div>
        </DrawerContent>
      </Drawer>
      <div id="recaptcha-container" />
    </>
  )
}
