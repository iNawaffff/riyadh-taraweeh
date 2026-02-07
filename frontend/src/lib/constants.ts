export const AREAS = ['شمال', 'جنوب', 'شرق', 'غرب'] as const
export type Area = (typeof AREAS)[number]

export const ROLE_LABELS: Record<string, { label: string; className: string }> = {
  admin: { label: 'مدير', className: 'bg-[#0d4b33] text-white border-transparent' },
  moderator: { label: 'مشرف', className: 'bg-[#c4a052]/15 text-[#8a6914] border-[#c4a052]/30' },
  user: { label: 'مستخدم', className: 'bg-gray-50 text-gray-500 border-gray-200' },
}

export const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  pending: { label: 'معلق', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  approved: { label: 'مقبول', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  rejected: { label: 'مرفوض', className: 'bg-red-50 text-red-700 border-red-200' },
}
