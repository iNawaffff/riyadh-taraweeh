import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface AreaFilterProps {
  value: string
  onChange: (value: string) => void
  areas: string[]
  isLoading?: boolean
}

export function AreaFilter({
  value,
  onChange,
  areas,
  isLoading = false,
}: AreaFilterProps) {
  return (
    <div className="relative">
      <label htmlFor="areaFilter" className="sr-only">
        تصفية حسب المنطقة
      </label>

      <Select value={value} onValueChange={onChange} disabled={isLoading}>
        <SelectTrigger
          id="areaFilter"
          className="h-14 rounded-xl border-border/60 bg-white text-base shadow-sm transition-all duration-300 hover:border-primary/40 focus:border-primary focus:ring-2 focus:ring-primary/15"
        >
          <SelectValue placeholder="كل المناطق" />
        </SelectTrigger>
        <SelectContent className="max-h-60">
          <SelectItem value="الكل">كل المناطق</SelectItem>
          {areas.map((area) => (
            <SelectItem key={area} value={area}>
              {area}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
