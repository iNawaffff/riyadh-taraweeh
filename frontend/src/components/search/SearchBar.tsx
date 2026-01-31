import { useState, useEffect, useCallback, useRef } from 'react'
import { Search, X, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  isSearching?: boolean
  placeholder?: string
}

export function SearchBar({
  value,
  onChange,
  isSearching = false,
  placeholder = 'ابحث عن مسجد أو إمام...',
}: SearchBarProps) {
  const [localValue, setLocalValue] = useState(value)
  const [isFocused, setIsFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Sync local value with external value
  useEffect(() => {
    setLocalValue(value)
  }, [value])

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setLocalValue(newValue)
    onChange(newValue)
  }, [onChange])

  const handleClear = useCallback(() => {
    setLocalValue('')
    onChange('')
    inputRef.current?.focus()
  }, [onChange])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      handleClear()
    }
  }, [handleClear])

  return (
    <div className={cn(
      'group relative rounded-xl transition-shadow duration-300',
      isFocused ? 'shadow-md' : 'shadow-sm'
    )}>
      <label htmlFor="searchInput" className="sr-only">
        ابحث عن مسجد أو إمام
      </label>

      {/* Search icon on the end side (left in RTL) — does NOT mirror per Apple HIG */}
      <div className="pointer-events-none absolute end-4 top-1/2 -translate-y-1/2 text-muted-foreground/50 transition-colors duration-200 group-focus-within:text-primary">
        {isSearching ? (
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        ) : (
          <Search className="h-5 w-5" style={{ transform: 'none' }} />
        )}
      </div>

      <Input
        ref={inputRef}
        id="searchInput"
        type="text"
        value={localValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={placeholder}
        autoComplete="off"
        className={cn(
          'h-14 rounded-xl pe-12 ps-4 text-lg transition-all duration-300',
          'border-border/60 bg-white',
          'focus:border-primary focus:ring-2 focus:ring-primary/15',
          'placeholder:text-muted-foreground/50 placeholder:text-base',
          isSearching && 'border-primary/40',
          localValue && 'ps-11'
        )}
      />

      {/* Clear button — appears on the start side (right in RTL) when there's text */}
      <div className={cn(
        'absolute start-3 top-1/2 -translate-y-1/2 transition-all duration-200',
        localValue ? 'scale-100 opacity-100' : 'pointer-events-none scale-75 opacity-0'
      )}>
        <button
          type="button"
          onClick={handleClear}
          className={cn(
            'flex h-7 w-7 items-center justify-center rounded-full',
            'text-muted-foreground transition-all duration-200',
            'hover:bg-destructive/10 hover:text-destructive',
            'active:scale-90'
          )}
          aria-label="مسح البحث"
          tabIndex={localValue ? 0 : -1}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
