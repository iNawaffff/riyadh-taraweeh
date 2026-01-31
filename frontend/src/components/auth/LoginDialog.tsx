import { useState, useEffect, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'
import { useAuth } from '@/hooks/use-auth'
import { useMediaQuery } from '@/hooks/use-media-query'
import { resetRecaptcha } from '@/lib/firebase'
import { Phone, ArrowRight, Moon } from 'lucide-react'
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
}

function getFirebaseError(e: unknown): string {
  if (e && typeof e === 'object' && 'code' in e) {
    const code = (e as { code: string }).code
    return FIREBASE_ERROR_MAP[code] || 'حدث خطأ، حاول مرة أخرى'
  }
  return 'حدث خطأ، حاول مرة أخرى'
}

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

  // Countdown timer for OTP resend
  useEffect(() => {
    if (countdown <= 0) return
    const timer = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [countdown])

  const resetState = useCallback(() => {
    setMode('main')
    setPhoneDigits('')
    setOtpCode('')
    setConfirmResult(null)
    setError('')
    setLoading(false)
    setCountdown(0)
    resetRecaptcha()
  }, [])

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

  const fullPhone = `+966${phoneDigits.replace(/\s/g, '')}`

  const handleSendOtp = async () => {
    const clean = phoneDigits.replace(/\s/g, '')
    if (clean.length !== 9) {
      setError('أدخل ٩ أرقام بعد 966+')
      return
    }
    setLoading(true)
    setError('')
    try {
      const result = await signInWithPhone(fullPhone, 'recaptcha-container')
      setConfirmResult(result)
      setMode('otp')
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
    } finally {
      setLoading(false)
    }
  }

  const toArabicNum = (n: number) => n.toString().replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[+d])

  const content = (
    <div className="space-y-5 px-1 pb-2" dir="rtl">
      {/* Branded header */}
      <div className="flex flex-col items-center gap-2 pt-1">
        <Moon className="h-8 w-8 text-primary" />
        <p className="text-lg font-bold text-foreground">أهلاً بك في أئمة التراويح</p>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 p-3 text-center text-sm text-red-600">{error}</p>
      )}

      {mode === 'main' && (
        <>
          <Button
            variant="outline"
            className="h-12 w-full gap-2 text-base"
            onClick={handleGoogleSignIn}
            disabled={loading}
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            {loading ? 'جارٍ...' : 'الدخول بحساب Google'}
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-background px-2 text-muted-foreground">أو</span>
            </div>
          </div>

          <Button
            variant="outline"
            className="h-12 w-full gap-2 text-base"
            onClick={() => { setError(''); setMode('phone') }}
          >
            <Phone className="h-4 w-4" />
            الدخول برقم الهاتف
          </Button>
        </>
      )}

      {mode === 'phone' && (
        <>
          <div className="flex items-center gap-2" dir="ltr">
            <span className="flex h-12 items-center rounded-md border bg-muted px-3 text-sm font-medium text-muted-foreground">
              966+
            </span>
            <Input
              dir="ltr"
              type="tel"
              inputMode="numeric"
              value={phoneDigits}
              onChange={(e) => setPhoneDigits(e.target.value.replace(/[^\d\s]/g, ''))}
              placeholder="5X XXX XXXX"
              className="h-12 flex-1 text-base"
              maxLength={12}
            />
          </div>
          <Button className="h-12 w-full text-base" onClick={handleSendOtp} disabled={loading}>
            {loading ? 'جارٍ الإرسال...' : 'إرسال رمز التحقق'}
          </Button>
          <Button variant="ghost" className="w-full gap-1" onClick={() => { setError(''); setMode('main') }}>
            <ArrowRight className="h-4 w-4" />
            رجوع
          </Button>
        </>
      )}

      {mode === 'otp' && (
        <>
          <p className="text-center text-sm text-muted-foreground">
            أدخل رمز التحقق المرسل إلى <span dir="ltr" className="font-medium">{fullPhone}</span>
          </p>
          <div className="flex justify-center" dir="ltr">
            <InputOTP
              maxLength={6}
              value={otpCode}
              onChange={(val) => {
                setOtpCode(val)
                if (val.length === 6) handleConfirmOtp(val)
              }}
            >
              <InputOTPGroup>
                {[0, 1, 2, 3, 4, 5].map(i => (
                  <InputOTPSlot key={i} index={i} className="h-14 w-12 text-xl" />
                ))}
              </InputOTPGroup>
            </InputOTP>
          </div>
          <Button className="h-12 w-full text-base" onClick={() => handleConfirmOtp(otpCode)} disabled={loading || otpCode.length !== 6}>
            {loading ? 'جارٍ التحقق...' : 'تأكيد'}
          </Button>
          {countdown > 0 ? (
            <p className="text-center text-sm text-muted-foreground">
              إعادة إرسال الرمز خلال {toArabicNum(countdown)} ثانية
            </p>
          ) : (
            <Button variant="ghost" className="w-full" onClick={handleResendOtp} disabled={loading}>
              إعادة إرسال الرمز
            </Button>
          )}
          <Button variant="ghost" className="w-full gap-1" onClick={() => { setError(''); setOtpCode(''); setMode('phone') }}>
            <ArrowRight className="h-4 w-4" />
            تغيير الرقم
          </Button>
        </>
      )}

    </div>
  )

  if (isDesktop) {
    return (
      <>
        <Dialog open={open} onOpenChange={(o) => { if (!o) resetState(); onOpenChange(o) }}>
          <DialogContent className="max-w-[400px]" dir="rtl">
            <DialogHeader>
              <DialogTitle className="sr-only">تسجيل الدخول</DialogTitle>
            </DialogHeader>
            {content}
          </DialogContent>
        </Dialog>
        {/* reCAPTCHA must be outside the dialog so its fallback challenge can render */}
        <div id="recaptcha-container" />
      </>
    )
  }

  return (
    <>
      <Drawer open={open} onOpenChange={(o) => { if (!o) resetState(); onOpenChange(o) }}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle className="sr-only">تسجيل الدخول</DrawerTitle>
          </DrawerHeader>
          <div className="mx-auto w-full max-w-[400px] px-4 pb-6">
            {content}
          </div>
        </DrawerContent>
      </Drawer>
      {/* reCAPTCHA must be outside the drawer so its fallback challenge can render */}
      <div id="recaptcha-container" />
    </>
  )
}
