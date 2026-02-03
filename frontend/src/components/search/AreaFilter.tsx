import { Compass } from 'lucide-react'
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
    <Select value={value} onValueChange={onChange} disabled={isLoading}>
      <SelectTrigger className="h-11 w-full gap-1.5 bg-white text-sm">
        <Compass className="h-4 w-4 shrink-0 text-muted-foreground" />
        <SelectValue placeholder="المنطقة" />
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
  )
}
