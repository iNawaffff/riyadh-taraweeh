import { Share2, Copy, Check } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface ShareButtonProps {
  mosqueId: number
  mosqueName: string
  imamName: string
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

const sizeClasses = {
  sm: 'h-11 w-11',
  md: 'h-11 w-11',
  lg: 'h-12 w-12',
}

const iconSizes = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  )
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    const textArea = document.createElement('textarea')
    textArea.value = text
    textArea.style.position = 'fixed'
    textArea.style.opacity = '0'
    document.body.appendChild(textArea)
    textArea.select()
    document.execCommand('copy')
    document.body.removeChild(textArea)
  }
}

export function ShareButton({
  mosqueId,
  mosqueName,
  imamName,
  className,
  size = 'md',
}: ShareButtonProps) {
  const [copied, setCopied] = useState(false)

  const url = `${window.location.origin}/mosque/${mosqueId}`
  const shareText = `استمع لتلاوة ${imamName} في ${mosqueName}`

  const handleNativeShare = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (navigator.share) {
      try {
        await navigator.share({ title: mosqueName, text: shareText, url })
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return
      }
    }
  }

  const handleWhatsApp = (e: React.MouseEvent) => {
    e.stopPropagation()
    window.open(`https://wa.me/?text=${encodeURIComponent(`${shareText}\n${url}`)}`, '_blank')
  }

  const handleX = (e: React.MouseEvent) => {
    e.stopPropagation()
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(url)}`,
      '_blank'
    )
  }

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation()
    await copyToClipboard(`${shareText} - ${url}`)
    setCopied(true)
    toast.success('تم نسخ الرابط', { duration: 2000 })
    setTimeout(() => setCopied(false), 2000)
  }

  const buttonEl = (
    <button
      className={cn(
        'flex items-center justify-center rounded-full',
        'transition-all duration-300',
        'hover:scale-110 active:scale-95',
        'bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-primary',
        sizeClasses[size],
        className
      )}
      aria-label="مشاركة"
      title="مشاركة"
    >
      <Share2 className={cn(iconSizes[size], 'transition-transform duration-300')} />
    </button>
  )

  // Mobile: use native Web Share API
  if (typeof navigator !== 'undefined' && 'share' in navigator) {
    return <div onClick={handleNativeShare}>{buttonEl}</div>
  }

  // Desktop: dropdown with WhatsApp, X, Copy
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild onClick={(e: React.MouseEvent) => e.stopPropagation()}>
        {buttonEl}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[160px]">
        <DropdownMenuItem onClick={handleWhatsApp} className="gap-2 cursor-pointer">
          <WhatsAppIcon className="h-4 w-4 text-[#25D366]" />
          <span>واتساب</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleX} className="gap-2 cursor-pointer">
          <XIcon className="h-4 w-4" />
          <span>X (تويتر)</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleCopy} className="gap-2 cursor-pointer">
          {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
          <span>نسخ الرابط</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
