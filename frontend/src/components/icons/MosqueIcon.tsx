import { FaMosque } from 'react-icons/fa'
import { cn } from '@/lib/utils'

interface MosqueIconProps {
  className?: string
}

/**
 * Mosque icon from Font Awesome via react-icons.
 * Inherits color from parent via currentColor.
 */
export function MosqueIcon({ className }: MosqueIconProps) {
  return <FaMosque className={cn('h-5 w-5', className)} aria-hidden="true" />
}
