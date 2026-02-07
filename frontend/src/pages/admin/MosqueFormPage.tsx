import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import MosqueForm from '@/components/admin/MosqueForm'
import { useAdminMosque, useCreateMosque, useUpdateMosque } from '@/hooks/use-admin'
import type { MosqueFormValues } from '@/components/admin/MosqueForm'

export default function MosqueFormPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isEdit = !!id

  const { data: mosque, isLoading } = useAdminMosque(
    isEdit ? Number(id) : undefined
  )

  const createMosque = useCreateMosque()
  const updateMosque = useUpdateMosque()

  const handleSubmit = async (data: MosqueFormValues) => {
    try {
      const payload = data as unknown as Record<string, unknown>
      if (isEdit && id) {
        await updateMosque.mutateAsync({ id: Number(id), data: payload })
        toast.success('تم تحديث المسجد')
      } else {
        await createMosque.mutateAsync(payload)
        toast.success('تم إضافة المسجد')
      }
      navigate('/dashboard/mosques')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'حدث خطأ')
    }
  }

  if (isEdit && isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate('/dashboard/mosques')}
        className="font-tajawal text-sm text-[#0d4b33]/50 hover:text-[#0d4b33]"
      >
        <ArrowRight className="h-4 w-4" />
        العودة للمساجد
      </Button>

      <MosqueForm
        mosque={mosque ?? null}
        onSubmit={handleSubmit}
        isSubmitting={createMosque.isPending || updateMosque.isPending}
      />
    </div>
  )
}
