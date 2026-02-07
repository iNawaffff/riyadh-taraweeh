import { useState, useEffect, useCallback, useRef } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'
import { useAuth } from '@/hooks/use-auth'
import { useMediaQuery } from '@/hooks/use-media-query'
import { resetRecaptcha } from '@/lib/firebase'
import { Phone, ArrowRight, Moon, Loader2, AlertCircle, X, Sparkles } from 'lucide-react'
import type { ConfirmationResult } from 'firebase/auth'
import { cn } from '@/lib/utils'

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
  'auth/popup-blocked': 'المتصفح منع النافذة المنبثقة، اسمح بالنوافذ المنبثقة وحاول مرة أخرى',
  'auth/popup-closed-by-user': 'تم إغلاق نافذة تسجيل الدخول',
  'auth/network-request-failed': 'تعذر الاتصال بالإنترنت، حاول مرة أخرى',
}

// Errors that should be silently ignored (not shown to user)
const FIREBASE_SILENT_ERRORS = new Set(['auth/cancelled-popup-request'])

function getFirebaseError(e: unknown): string | null {
  console.error('Firebase auth error:', e)
  if (e && typeof e === 'object' && 'code' in e) {
    const code = (e as { code: string }).code
    if (FIREBASE_SILENT_ERRORS.has(code)) return null
    return FIREBASE_ERROR_MAP[code] || `حدث خطأ: ${code}`
  }
  // Handle timeout errors from withTimeout wrapper
  if (e instanceof Error && e.message.startsWith('تعذر')) {
    return e.message
  }
  return 'حدث خطأ، حاول مرة أخرى'
}

/**
 * Normalize Saudi phone input to 9-digit format (5XXXXXXXX)
 * Handles: 05XXXXXXXX, 5XXXXXXXX, 00966..., +966..., spaces, dashes
 */
function normalizeSaudiPhone(input: string): string {
  let digits = input.replace(/\D/g, '')
  if (digits.startsWith('00966')) digits = digits.slice(5)
  else if (digits.startsWith('966')) digits = digits.slice(3)
  if (digits.startsWith('0')) digits = digits.slice(1)
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
  const submitButtonRef = useRef<HTMLButtonElement>(null)
  const [animatingOut, setAnimatingOut] = useState(false)
  const [shakeError, setShakeError] = useState(false)
  const [phoneAttempts, setPhoneAttempts] = useState(0)
  const MAX_PHONE_ATTEMPTS = 3

  // Countdown timer for OTP resend
  useEffect(() => {
    if (countdown <= 0) return
    const timer = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [countdown])

  // Focus phone input when entering phone mode
  useEffect(() => {
    if (mode === 'phone' && phoneInputRef.current) {
      setTimeout(() => phoneInputRef.current?.focus(), 150)
    }
  }, [mode])

  // Scroll submit button into view when keyboard opens (mobile)
  const handlePhoneFocus = useCallback(() => {
    // Small delay to let keyboard open
    setTimeout(() => {
      submitButtonRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 300)
  }, [])

  // Trigger shake animation on error
  useEffect(() => {
    if (error) {
      setShakeError(true)
      const timer = setTimeout(() => setShakeError(false), 500)
      return () => clearTimeout(timer)
    }
  }, [error])

  const resetState = useCallback(() => {
    setMode('main')
    setPhoneDigits('')
    setOtpCode('')
    setConfirmResult(null)
    setError('')
    setLoading(false)
    setCountdown(0)
    setAnimatingOut(false)
    setShakeError(false)
    setPhoneAttempts(0)
    resetRecaptcha()
  }, [])

  const transitionTo = (newMode: 'main' | 'phone' | 'otp') => {
    setAnimatingOut(true)
    setError('')
    setTimeout(() => {
      setMode(newMode)
      setAnimatingOut(false)
    }, 200)
  }

  const handleGoogleSignIn = async () => {
    setLoading(true)
    setError('')
    try {
      await signInWithGoogle()
      onOpenChange(false)
    } catch (e) {
      const msg = getFirebaseError(e)
      if (msg) setError(msg)
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

    // Check if max attempts reached
    if (phoneAttempts >= MAX_PHONE_ATTEMPTS) {
      setError('محاولات كثيرة، أغلق النافذة وحاول مرة أخرى')
      return
    }

    setLoading(true)
    setError('')
    setPhoneAttempts(prev => prev + 1)

    try {
      const result = await signInWithPhone(fullPhone, 'recaptcha-container')
      setConfirmResult(result)
      setPhoneAttempts(0) // Reset attempts on success
      transitionTo('otp')
      setCountdown(30)
    } catch (e) {
      const msg = getFirebaseError(e)
      if (msg) {
        // Add attempt info if not at max yet
        const remaining = MAX_PHONE_ATTEMPTS - phoneAttempts
        if (remaining > 0 && remaining < MAX_PHONE_ATTEMPTS) {
          setError(`${msg} (${toArabicNum(remaining)} محاولات متبقية)`)
        } else if (remaining <= 0) {
          setError('محاولات كثيرة، أغلق النافذة وحاول مرة أخرى')
        } else {
          setError(msg)
        }
      }
    } finally {
      setLoading(false)
    }
  }

  const handleResendOtp = async () => {
    // Check if max attempts reached
    if (phoneAttempts >= MAX_PHONE_ATTEMPTS) {
      setError('محاولات كثيرة، أغلق النافذة وحاول مرة أخرى')
      return
    }

    setLoading(true)
    setError('')
    setOtpCode('')
    setPhoneAttempts(prev => prev + 1)

    try {
      const result = await signInWithPhone(fullPhone, 'recaptcha-container')
      setConfirmResult(result)
      setCountdown(30)
    } catch (e) {
      const msg = getFirebaseError(e)
      if (msg) {
        const remaining = MAX_PHONE_ATTEMPTS - phoneAttempts
        if (remaining <= 0) {
          setError('محاولات كثيرة، أغلق النافذة وحاول مرة أخرى')
        } else {
          setError(msg)
        }
      }
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
      const msg = getFirebaseError(e)
      if (msg) setError(msg)
      setOtpCode('')
    } finally {
      setLoading(false)
    }
  }

  const isPhoneValid = phoneDigits.length === 9 && phoneDigits.startsWith('5')

  // Shared content component
  const content = (
    <div
      className={cn(
        'relative overflow-hidden transition-all duration-200',
        animatingOut ? 'opacity-0 scale-[0.98]' : 'opacity-100 scale-100'
      )}
      dir="rtl"
    >
      {/* Decorative Islamic geometric background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-[0.04]">
        <div className="absolute -start-12 -top-12 h-40 w-40 rounded-full border-[20px] border-primary" />
        <div className="absolute -bottom-8 -end-8 h-32 w-32 rounded-full border-[16px] border-accent" />
        <div className="absolute end-1/4 top-1/3 h-20 w-20 rotate-45 border-[8px] border-primary/50" />
      </div>

      <div className="relative flex flex-col">
        {/* Branded header - Moon with glow effect */}
        <div className="flex flex-col items-center gap-4 pb-6 pt-2">
          <div className="relative">
            {/* Animated glow ring */}
            <div className="absolute inset-0 animate-pulse rounded-2xl bg-primary/20 blur-xl" />
            <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary via-primary to-primary-dark shadow-2xl shadow-primary/30 md:h-16 md:w-16">
              <Moon className="h-10 w-10 text-white md:h-8 md:w-8" strokeWidth={1.5} />
            </div>
            <Sparkles className="absolute -end-2 -top-2 h-6 w-6 animate-pulse text-accent" />
          </div>
          <div className="text-center">
            <h2 className="text-2xl font-bold text-foreground md:text-xl">أهلاً بك</h2>
            <p className="mt-1 text-base text-muted-foreground md:text-sm">في أئمة التراويح</p>
          </div>
        </div>

        {/* Error state with shake animation */}
        {error && (
          <div
            className={cn(
              'mx-1 mb-5 rounded-2xl bg-destructive/10 p-4 text-destructive',
              'animate-in fade-in slide-in-from-top-2 duration-300',
              shakeError && 'animate-shake'
            )}
          >
            <div className="flex items-center gap-3">
              <AlertCircle className="h-6 w-6 shrink-0" />
              <p className="text-sm font-semibold">{error}</p>
            </div>
            {/* Show reset button when max attempts reached */}
            {phoneAttempts >= MAX_PHONE_ATTEMPTS && (
              <button
                type="button"
                onClick={() => {
                  setPhoneAttempts(0)
                  setError('')
                  resetRecaptcha()
                }}
                className="mt-3 w-full rounded-xl bg-destructive/20 py-2 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/30"
              >
                إعادة المحاولة من جديد
              </button>
            )}
          </div>
        )}

        {/* Main mode - Auth options */}
        {mode === 'main' && (
          <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-3 duration-300">
            {/* Google Sign-in - Large touch target */}
            <Button
              variant="outline"
              className={cn(
                'group h-16 w-full justify-start gap-4 rounded-2xl border-2 px-5',
                'text-lg font-semibold transition-all duration-200',
                'hover:border-primary/40 hover:bg-primary/5 hover:shadow-lg',
                'active:scale-[0.98]',
                'md:h-14 md:text-base'
              )}
              onClick={handleGoogleSignIn}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white shadow-md ring-1 ring-border/30 md:h-9 md:w-9">
                  <svg className="h-6 w-6 md:h-5 md:w-5" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                </div>
              )}
              <span>المتابعة بحساب Google</span>
            </Button>

            {/* Divider */}
            <div className="relative py-3">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t-2 border-dashed border-border/60" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-background px-4 text-sm font-medium text-muted-foreground">أو</span>
              </div>
            </div>

            {/* Phone Sign-in */}
            <Button
              variant="outline"
              className={cn(
                'group h-16 w-full justify-start gap-4 rounded-2xl border-2 px-5',
                'text-lg font-semibold transition-all duration-200',
                'hover:border-primary/40 hover:bg-primary/5 hover:shadow-lg',
                'active:scale-[0.98]',
                'md:h-14 md:text-base'
              )}
              onClick={() => transitionTo('phone')}
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-all duration-200 group-hover:bg-primary group-hover:text-white group-hover:shadow-lg md:h-9 md:w-9">
                <Phone className="h-6 w-6 md:h-5 md:w-5" />
              </div>
              <span>المتابعة برقم الجوال</span>
            </Button>
          </div>
        )}

        {/* Phone mode - Phone input */}
        {mode === 'phone' && (
          <div className="flex flex-col gap-5 animate-in fade-in slide-in-from-bottom-3 duration-300">
            <div className="space-y-3">
              <label className="block text-base font-semibold text-foreground md:text-sm">رقم الجوال</label>
              <div className="flex items-stretch gap-3" dir="ltr">
                {/* Country code badge - Large touch target */}
                <div className="flex items-center justify-center rounded-2xl border-2 border-primary/30 bg-gradient-to-b from-primary/10 to-primary/5 px-4 text-lg font-bold text-primary shadow-sm md:px-3 md:text-base">
                  <span>966+</span>
                </div>
                {/* Phone input - Large */}
                <div className="relative flex-1">
                  <Input
                    ref={phoneInputRef}
                    dir="ltr"
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel"
                    value={formatPhoneDisplay(phoneDigits)}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && isPhoneValid && handleSendOtp()}
                    onFocus={handlePhoneFocus}
                    placeholder="5XX XXX XXXX"
                    className={cn(
                      'h-16 rounded-2xl border-2 pe-14 text-center text-xl font-semibold tracking-widest',
                      'transition-all duration-200',
                      'focus:border-primary focus:ring-4 focus:ring-primary/20',
                      'md:h-14 md:text-lg'
                    )}
                  />
                  {/* Character counter */}
                  {phoneDigits.length > 0 && (
                    <div className="absolute end-4 top-1/2 -translate-y-1/2">
                      <span className={cn(
                        'rounded-lg px-2 py-1 text-sm font-bold transition-colors',
                        isPhoneValid
                          ? 'bg-primary/10 text-primary'
                          : 'bg-muted text-muted-foreground'
                      )}>
                        {toArabicNum(phoneDigits.length)}/٩
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <p className="text-center text-sm text-muted-foreground">
                أدخل رقم الجوال بدون صفر (مثال: 5XXXXXXXX)
              </p>
            </div>

            {/* Submit button - Thumb zone friendly, at bottom */}
            <Button
              ref={submitButtonRef}
              className={cn(
                'h-16 w-full rounded-2xl text-lg font-bold',
                'shadow-xl shadow-primary/25 transition-all duration-200',
                'hover:shadow-2xl hover:shadow-primary/30',
                'active:scale-[0.98]',
                'disabled:shadow-none',
                'md:h-14 md:text-base'
              )}
              onClick={handleSendOtp}
              disabled={loading || !isPhoneValid}
            >
              {loading ? (
                <span className="flex items-center gap-3">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span>جارٍ الإرسال...</span>
                </span>
              ) : (
                'إرسال رمز التحقق'
              )}
            </Button>

            {/* Back button - RTL aware with flipped arrow */}
            <button
              type="button"
              className={cn(
                'flex w-full items-center justify-center gap-2 py-3',
                'text-base font-medium text-muted-foreground',
                'transition-colors duration-200 hover:text-foreground',
                'active:scale-[0.98]'
              )}
              onClick={() => transitionTo('main')}
            >
              <ArrowRight className="h-5 w-5 rtl:rotate-180" />
              <span>رجوع</span>
            </button>
          </div>
        )}

        {/* OTP mode - Verification code */}
        {mode === 'otp' && (
          <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-3 duration-300">
            <div className="text-center">
              <p className="text-base text-muted-foreground md:text-sm">
                أدخل رمز التحقق المرسل إلى
              </p>
              <p dir="ltr" className="mt-2 text-xl font-bold tracking-wider text-foreground md:text-lg">
                +966 {formatPhoneDisplay(phoneDigits)}
              </p>
            </div>

            {/* OTP Input - Single row of 6 digits for clarity */}
            <div className="flex justify-center py-2" dir="ltr">
              <InputOTP
                maxLength={6}
                value={otpCode}
                onChange={(val) => {
                  setOtpCode(val)
                  if (val.length === 6) handleConfirmOtp(val)
                }}
                disabled={loading}
              >
                <InputOTPGroup className="gap-2">
                  {[0, 1, 2, 3, 4, 5].map(i => (
                    <InputOTPSlot
                      key={i}
                      index={i}
                      className={cn(
                        'h-14 w-11 rounded-xl border-2 text-xl font-bold',
                        'transition-all duration-200',
                        'data-[active=true]:border-primary data-[active=true]:ring-4 data-[active=true]:ring-primary/20',
                        'data-[active=true]:scale-105',
                        'md:h-12 md:w-10 md:text-lg'
                      )}
                    />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </div>

            {/* Confirm button */}
            <Button
              className={cn(
                'h-16 w-full rounded-2xl text-lg font-bold',
                'shadow-xl shadow-primary/25 transition-all duration-200',
                'hover:shadow-2xl hover:shadow-primary/30',
                'active:scale-[0.98]',
                'disabled:shadow-none',
                'md:h-14 md:text-base'
              )}
              onClick={() => handleConfirmOtp(otpCode)}
              disabled={loading || otpCode.length !== 6}
            >
              {loading ? (
                <span className="flex items-center gap-3">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span>جارٍ التحقق...</span>
                </span>
              ) : (
                'تأكيد'
              )}
            </Button>

            {/* Resend OTP with countdown */}
            <div className="text-center">
              {countdown > 0 ? (
                <div className="flex items-center justify-center gap-3">
                  <span className="text-base text-muted-foreground">إعادة الإرسال خلال</span>
                  {/* Circular countdown badge */}
                  <div className="relative flex h-10 w-10 items-center justify-center">
                    <svg className="absolute inset-0 -rotate-90" viewBox="0 0 40 40">
                      <circle
                        cx="20" cy="20" r="18"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        className="text-muted/30"
                      />
                      <circle
                        cx="20" cy="20" r="18"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        className="text-primary transition-all duration-1000"
                        strokeDasharray={`${(countdown / 30) * 113} 113`}
                      />
                    </svg>
                    <span className="text-sm font-bold text-foreground">
                      {toArabicNum(countdown)}
                    </span>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  className={cn(
                    'rounded-xl px-4 py-2 text-base font-semibold text-primary',
                    'transition-all duration-200',
                    'hover:bg-primary/10 active:scale-[0.98]',
                    'disabled:opacity-50'
                  )}
                  onClick={handleResendOtp}
                  disabled={loading}
                >
                  إعادة إرسال الرمز
                </button>
              )}
            </div>

            {/* Change number */}
            <button
              type="button"
              className={cn(
                'flex w-full items-center justify-center gap-2 py-3',
                'text-base font-medium text-muted-foreground',
                'transition-colors duration-200 hover:text-foreground',
                'active:scale-[0.98]'
              )}
              onClick={() => { setOtpCode(''); transitionTo('phone') }}
            >
              <ArrowRight className="h-5 w-5 rtl:rotate-180" />
              <span>تغيير الرقم</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )

  // Desktop: Dialog
  if (isDesktop) {
    return (
      <>
        <Dialog open={open} onOpenChange={(o) => { if (!o) resetState(); onOpenChange(o) }}>
          <DialogContent className="max-w-[440px] gap-0 overflow-hidden rounded-3xl p-8" dir="rtl">
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

  // Mobile: Drawer (bottom sheet)
  // Prevent accidental closure during phone/otp input
  const isInputMode = mode === 'phone' || mode === 'otp'

  const handleDrawerClose = useCallback(() => {
    resetState()
    onOpenChange(false)
  }, [resetState, onOpenChange])

  return (
    <>
      <Drawer
        open={open}
        onOpenChange={(o) => {
          // Only allow closing via X button when in input mode
          if (!o && isInputMode) return
          if (!o) resetState()
          onOpenChange(o)
        }}
        // Disable swipe-to-dismiss during input
        dismissible={!isInputMode}
      >
        <DrawerContent className="max-h-[92vh] rounded-t-[2rem] focus:outline-none" dir="rtl">
          {/* Explicit close button - always works */}
          <button
            type="button"
            onClick={handleDrawerClose}
            className="absolute end-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-muted/80 text-muted-foreground backdrop-blur-sm transition-colors hover:bg-muted hover:text-foreground active:scale-95"
          >
            <X className="h-5 w-5" />
            <span className="sr-only">إغلاق</span>
          </button>

          <DrawerHeader className="pb-0 pt-2">
            <DrawerTitle className="sr-only">تسجيل الدخول</DrawerTitle>
          </DrawerHeader>

          {/* Scrollable content with safe area padding for iPhone */}
          <div
            className="mx-auto w-full max-w-[440px] overflow-y-auto px-6 pb-10 pt-4"
            style={{ paddingBottom: 'max(2.5rem, env(safe-area-inset-bottom))' }}
          >
            {content}
          </div>
        </DrawerContent>
      </Drawer>
      <div id="recaptcha-container" />
    </>
  )
}
