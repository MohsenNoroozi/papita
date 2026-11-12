"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { HugeiconsIcon } from "@hugeicons/react"
import { Delete02Icon } from "@hugeicons/core-free-icons"

import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/sources/confirm-dialog"
import { deleteSource } from "@/app/(admin)/sources/[id]/actions"

export function DeleteSourceButton({ sourceId, title }: { sourceId: number; title: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function handleConfirm() {
    startTransition(async () => {
      const res = await deleteSource(sourceId)
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      toast.success("منبع حذف شد")
      router.replace("/sources")
    })
  }

  return (
    <ConfirmDialog
      title="حذف منبع"
      description={`منبع «${title}» و ارتباط واژه‌های آن حذف می‌شود. خودِ واژه‌ها حذف نخواهند شد.`}
      confirmLabel="حذف منبع"
      onConfirm={handleConfirm}
      trigger={
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          className="h-10 border-destructive px-5 text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          <HugeiconsIcon icon={Delete02Icon} size={18} aria-hidden="true" />
          حذف منبع
        </Button>
      }
    />
  )
}
