import { useState } from 'react'
import { Check, ChevronsUpDown, Plus, X, Loader2 } from 'lucide-react'
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
import { useImamSearch } from '@/hooks/use-transfers'
import { useDebounce } from '@/hooks/use-debounce'

export interface ImamValue {
  id: number | null
  name: string
  mosqueName?: string | null
  mosqueId?: number | null
}

interface ImamComboboxProps {
  value: ImamValue
  onChange: (value: ImamValue) => void
  placeholder?: string
  className?: string
}

export default function ImamCombobox({
  value,
  onChange,
  placeholder = 'ابحث أو أضف إمام جديد',
  className,
}: ImamComboboxProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)
  const { data: results = [], isLoading } = useImamSearch(debouncedSearch)

  const trimmed = search.trim()
  const prefixed = trimmed.startsWith('الشيخ') ? trimmed : trimmed ? `الشيخ ${trimmed}` : ''
  const hasExactMatch = results.some((r) => r.name === prefixed || r.name === trimmed)
  const showAddOption = trimmed.length >= 2 && !hasExactMatch

  const handleSelect = (imam: { id: number; name: string; mosque_name: string | null; mosque_id: number | null }) => {
    onChange({ id: imam.id, name: imam.name, mosqueName: imam.mosque_name, mosqueId: imam.mosque_id })
    setOpen(false)
    setSearch('')
  }

  const handleAddNew = () => {
    onChange({ id: null, name: prefixed, mosqueName: null, mosqueId: null })
    setOpen(false)
    setSearch('')
  }

  const handleClear = () => {
    onChange({ id: null, name: '', mosqueName: null, mosqueId: null })
  }

  if (value.name) {
    return (
      <div
        className={cn(
          'flex items-center gap-2 rounded-md border border-[#0d4b33]/10 px-3 py-2',
          className
        )}
      >
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#0d4b33]/10 px-3 py-1 font-tajawal text-sm text-[#0d4b33]">
          <Check className="h-3.5 w-3.5" />
          {value.name}
          {value.id && (
            <span className="text-[#0d4b33]/40">(موجود)</span>
          )}
        </span>
        <button
          type="button"
          onClick={handleClear}
          className="mr-auto rounded-full p-1 text-[#0d4b33]/40 transition-colors hover:bg-[#0d4b33]/5 hover:text-[#0d4b33]/70"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    )
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            'w-full justify-between border-[#0d4b33]/10 font-tajawal text-sm font-normal hover:bg-transparent focus-visible:ring-[#c4a052]/30',
            'text-muted-foreground',
            className
          )}
        >
          {placeholder}
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="اكتب اسم الإمام..."
            value={search}
            onValueChange={setSearch}
            className="font-tajawal"
          />
          <CommandList>
            {isLoading && debouncedSearch.length >= 1 ? (
              <div className="flex items-center justify-center gap-2 py-6 text-[#0d4b33]/50">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="font-tajawal text-sm">جاري البحث...</span>
              </div>
            ) : (
              <>
                {results.length === 0 && !showAddOption && trimmed.length >= 1 && (
                  <CommandEmpty className="py-3 text-center font-tajawal text-sm text-[#0d4b33]/50">
                    لا توجد نتائج
                  </CommandEmpty>
                )}
                {results.length > 0 && (
                  <CommandGroup>
                    {results.map((imam) => (
                      <CommandItem
                        key={imam.id}
                        value={String(imam.id)}
                        onSelect={() => handleSelect(imam)}
                        className="font-tajawal"
                      >
                        <div className="flex flex-col gap-0.5">
                          <span>{imam.name}</span>
                          {imam.mosque_name && (
                            <span className="text-xs text-[#0d4b33]/40">
                              {imam.mosque_name}
                            </span>
                          )}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
                {showAddOption && (
                  <CommandGroup>
                    <CommandItem
                      value="__add_new__"
                      onSelect={handleAddNew}
                      className="font-tajawal text-[#c4a052]"
                    >
                      <Plus className="h-4 w-4" />
                      إضافة &quot;{prefixed}&quot; كإمام جديد
                    </CommandItem>
                  </CommandGroup>
                )}
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
