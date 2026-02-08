import { useState } from 'react'
import { Check, ChevronsUpDown, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useLocations } from '@/hooks/use-mosques'

interface LocationComboboxProps {
  value: string
  onChange: (value: string) => void
  area?: string
  placeholder?: string
  className?: string
  disabled?: boolean
}

export default function LocationCombobox({
  value,
  onChange,
  area,
  placeholder = 'اختر الحي',
  className,
  disabled,
}: LocationComboboxProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const { data: locations = [] } = useLocations(area || undefined)

  const hasExactMatch = locations.some(
    (loc) => loc === search.trim()
  )

  const showAddOption = search.trim().length >= 2 && !hasExactMatch

  const hasHayPrefix = search.trim().startsWith('حي')

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            'w-full justify-between border-[#0d4b33]/10 font-tajawal text-sm font-normal hover:bg-transparent focus-visible:ring-[#c4a052]/30',
            !value && 'text-muted-foreground',
            className
          )}
        >
          {value || placeholder}
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="ابحث عن حي..."
            value={search}
            onValueChange={setSearch}
            className="font-tajawal"
          />
          <CommandList>
            <CommandEmpty className="py-3 text-center font-tajawal text-sm text-[#0d4b33]/50">
              لا توجد نتائج
            </CommandEmpty>
            <CommandGroup>
              {locations
                .filter((loc) =>
                  !search.trim() || loc.includes(search.trim())
                )
                .map((loc) => (
                  <CommandItem
                    key={loc}
                    value={loc}
                    onSelect={() => {
                      onChange(loc)
                      setOpen(false)
                      setSearch('')
                    }}
                    className="font-tajawal"
                  >
                    <Check
                      className={cn(
                        'h-4 w-4',
                        value === loc ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    {loc}
                  </CommandItem>
                ))}
            </CommandGroup>
            {showAddOption && (
              <CommandGroup>
                <CommandItem
                  value={`__add__${search.trim()}`}
                  onSelect={() => {
                    onChange(search.trim())
                    setOpen(false)
                    setSearch('')
                  }}
                  className="font-tajawal text-[#c4a052]"
                >
                  <Plus className="h-4 w-4" />
                  إضافة &quot;{search.trim()}&quot; كحي جديد
                </CommandItem>
                {hasHayPrefix && (
                  <p className="px-2 pb-2 font-tajawal text-[11px] text-amber-600">
                    تنبيه: لا تضف كلمة &quot;حي&quot; — تُضاف تلقائياً في الواجهة
                  </p>
                )}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
