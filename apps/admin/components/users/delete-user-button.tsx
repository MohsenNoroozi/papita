"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { HugeiconsIcon } from "@hugeicons/react"
import { Delete02Icon } from "@hugeicons/core-free-icons"

import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/sources/confirm-dialog"
import { deleteUser } from "@/app/(admin)/users/[id]/actions"

export function DeleteUserButton({ userId, fullname }: { userId: string; fullname: string }) {
    const router = useRouter()
    const [pending, startTransition] = useTransition()

    function handleConfirm() {
        startTransition(async () => {
            const res = await deleteUser(userId)
            if (!res.ok) {
                toast.error(res.error)
                return
            }
            toast.success("کاربر حذف شد")
            router.replace("/users")
        })
    }

    return (
        <ConfirmDialog
            title="حذف کاربر"
            description={`کاربر «${fullname}» همراه با تمام پیشرفتش برای همیشه حذف می‌شود. این کار قابل بازگشت نیست.`}
            confirmLabel="حذف کاربر"
            onConfirm={handleConfirm}
            trigger={
                <Button
                    type="button"
                    variant="outline"
                    disabled={pending}
                    className="h-10 border-destructive px-5 text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                    <HugeiconsIcon icon={Delete02Icon} size={18} aria-hidden="true" />
                    حذف کاربر
                </Button>
            }
        />
    )
}