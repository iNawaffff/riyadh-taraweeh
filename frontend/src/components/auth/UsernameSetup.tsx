import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/hooks/use-auth'
import { useMediaQuery } from '@/hooks/use-media-query'
import { Moon } from 'lucide-react'

export function UsernameSetup() {
  const { needsRegistration, firebaseUser, register } = useAuth()
  const isDesktop = useMediaQuery('(min-width: 768px)')
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState(firebaseUser?.displayName || '')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  const handleSubmit = async () => {
    if (username.length < 3) {
      setError('اسم المستخدم يجب أن يكون ٣ أحرف على الأقل')
      return
    }
    setLoading(true)
    setError('')
    try {
      await register(username, displayName || undefined)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'فشل إنشاء الحساب')
    } finally {
      setLoading(false)
    }
  }

  if (!needsRegistration) return null

  if (dismissed) {
    return (
      <button
        onClick={() => setDismissed(false)}
        className="fixed bottom-20 start-4 z-50 rounded-full bg-primary px-4 py-2.5 text-sm font-medium text-white shadow-lg transition-all hover:bg-primary-dark hover:shadow-xl active:scale-95"
      >
        أكمل إعداد حسابك
      </button>
    )
  }

  const content = (
    <div className="space-y-5 px-1 pb-2" dir="rtl">
      <div className="flex flex-col items-center gap-2 pt-1">
        <Moon className="h-8 w-8 text-primary" />
        <p className="text-lg font-bold text-foreground">إعداد الحساب</p>
        <p className="text-sm text-muted-foreground">مرحباً! اختر اسم مستخدم لحسابك</p>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 p-3 text-center text-sm text-red-600">{error}</p>
      )}

      <div className="space-y-2">
        <label className="text-sm font-medium">اسم المستخدم</label>
        <Input
          dir="ltr"
          value={username}
          onChange={(e) => setUsername(e.target.value.replace(/[^\w\u0600-\u06FF]/g, ''))}
          placeholder="username"
          maxLength={30}
          className="h-12 text-center text-base"
        />
        <p className="text-xs text-muted-foreground">
          سيظهر في رابط ملفك: taraweeh.org/u/{username || '...'}
        </p>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">الاسم المعروض (اختياري)</label>
        <Input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="اسمك"
          maxLength={100}
          className="h-12 text-base"
        />
      </div>

      <Button className="h-12 w-full text-base" onClick={handleSubmit} disabled={loading}>
        {loading ? 'جارٍ الإنشاء...' : 'إنشاء الحساب'}
      </Button>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="w-full text-center text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        لاحقاً
      </button>
    </div>
  )

  if (isDesktop) {
    return (
      <Dialog open={needsRegistration}>
        <DialogContent className="max-w-[400px]" dir="rtl">
          <DialogHeader>
            <DialogTitle className="sr-only">إعداد الحساب</DialogTitle>
          </DialogHeader>
          {content}
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Drawer open={needsRegistration}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle className="sr-only">إعداد الحساب</DrawerTitle>
        </DrawerHeader>
        <div className="mx-auto w-full max-w-[400px] px-4 pb-6">
          {content}
        </div>
      </DrawerContent>
    </Drawer>
  )
}
