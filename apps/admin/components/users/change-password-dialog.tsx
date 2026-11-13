"use client"

import { useState, useTransition, type FormEvent } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { changeUserPassword } from "@/app/(admin)/users/[id]/actions"

export function ChangePasswordDialog({ userId, fullname }: { userId: string; fullname: string }) {
    const [open, setOpen] = useState(false)
    const [password, setPassword] = useState("")
    const [confirm, setConfirm] = useState("")
    const [error, setError] = useState<string | null>(null)
    const [pending, startTransition] = useTransition()

    const mismatch = confirm !== "" && password !== confirm
    const canSave = password.length >= 8 && password === confirm

    function handleOpenChange(next: boolean) {
        if (pending) return
        if (next) {
            setPassword("")
            setConfirm("")
            setError(null)
        }
        setOpen(next)
    }

    function handleSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault()
        if (!canSave || pending) return
        setError(null)

        startTransition(async () => {
            const res = await changeUserPassword(userId, password)
            if (!res.ok) {
                setError(res.error)
                return
            }
            toast.success("رمز عبور تغییر کرد")
            setOpen(false)
        })
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger render={<Button type="button" variant="outline" className="h-10 px-5" />}>
                تغییر رمز عبور
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <DialogHeader>
                        <DialogTitle>تغییر رمز عبور</DialogTitle>
                        <DialogDescription>رمز عبور جدید «{fullname}» را وارد کنید (حداقل ۸ کاراکتر).</DialogDescription>
                    </DialogHeader>

                    <FieldGroup>
                        <Field>
                            <FieldLabel htmlFor="new-password">رمز عبور جدید</FieldLabel>
                            <Input
                                id="new-password"
                                type="password"
                                dir="ltr"
                                autoFocus
                                required
                                minLength={8}
                                autoComplete="new-password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </Field>

                        <Field>
                            <FieldLabel htmlFor="confirm-password">تکرار رمز عبور</FieldLabel>
                            <Input
                                id="confirm-password"
                                type="password"
                                dir="ltr"
                                required
                                autoComplete="new-password"
                                value={confirm}
                                onChange={(e) => setConfirm(e.target.value)}
                                aria-invalid={mismatch}
                            />
                        </Field>

                        <FieldError>{mismatch ? "رمز عبور و تکرار آن یکسان نیست" : error}</FieldError>
                    </FieldGroup>

                    <DialogFooter>
                        <Button type="submit" disabled={!canSave || pending} className="bg-brand-deep">
                            {pending ? "در حال ذخیره..." : "ذخیره"}
                        </Button>
                        <Button type="button" variant="outline" disabled={pending} onClick={() => handleOpenChange(false)}>
                            انصراف
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}