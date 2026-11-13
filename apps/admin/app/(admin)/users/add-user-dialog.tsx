"use client"

import { useState, useTransition, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { createUser } from "./actions"

const EMPTY = { fullname: "", email: "", password: "", phone: "", age: "", avatarUrl: "" }

export function AddUserDialog({
                                  open,
                                  onOpenChange,
                              }: {
    open: boolean
    onOpenChange: (open: boolean) => void
}) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [form, setForm] = useState(EMPTY)
    const [error, setError] = useState<string | null>(null)

    const set = (k: keyof typeof EMPTY) => (v: string) => setForm((s) => ({ ...s, [k]: v }))
    const canSave = form.fullname.trim() !== "" && form.email.trim() !== "" && form.password.length >= 8

    function handleOpenChange(next: boolean) {
        if (isPending) return
        if (next) {
            setForm(EMPTY)
            setError(null)
        }
        onOpenChange(next)
    }

    function handleSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault()
        if (!canSave || isPending) return
        setError(null)

        startTransition(async () => {
            const result = await createUser(form)

            if (!result.ok) {
                setError(result.error)
                return
            }

            toast.success(`کاربر «${result.fullname}» اضافه شد`)
            onOpenChange(false)
            router.push(`/users/${result.id}`)
        })
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <DialogHeader>
                        <DialogTitle>کاربر جدید</DialogTitle>
                        <DialogDescription>نام و ایمیل الزامی است؛ بقیهٔ فیلدها اختیاری‌اند.</DialogDescription>
                    </DialogHeader>

                    <FieldGroup>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <Field>
                                <FieldLabel htmlFor="user-fullname">نام</FieldLabel>
                                <Input
                                    id="user-fullname"
                                    autoFocus
                                    required
                                    maxLength={100}
                                    value={form.fullname}
                                    onChange={(e) => set("fullname")(e.target.value)}
                                    aria-invalid={!!error}
                                />
                            </Field>

                            <Field>
                                <FieldLabel htmlFor="user-email">ایمیل</FieldLabel>
                                <Input
                                    id="user-email"
                                    type="email"
                                    dir="ltr"
                                    required
                                    value={form.email}
                                    onChange={(e) => set("email")(e.target.value)}
                                />
                            </Field>

                            <Field>
                                <FieldLabel htmlFor="user-password">رمز عبور</FieldLabel>
                                <Input
                                    id="user-password"
                                    type="password"
                                    dir="ltr"
                                    required
                                    minLength={8}
                                    autoComplete="new-password"
                                    value={form.password}
                                    onChange={(e) => set("password")(e.target.value)}
                                />
                            </Field>

                            <Field>
                                <FieldLabel htmlFor="user-phone">شماره تلفن</FieldLabel>
                                <Input
                                    id="user-phone"
                                    type="tel"
                                    dir="ltr"
                                    inputMode="tel"
                                    value={form.phone}
                                    onChange={(e) => set("phone")(e.target.value)}
                                />
                            </Field>

                            <Field>
                                <FieldLabel htmlFor="user-age">سن</FieldLabel>
                                <Input
                                    id="user-age"
                                    inputMode="numeric"
                                    maxLength={3}
                                    value={form.age}
                                    onChange={(e) => set("age")(e.target.value)}
                                />
                            </Field>

                            <Field>
                                <FieldLabel htmlFor="user-avatar">آدرس آواتار</FieldLabel>
                                <Input
                                    id="user-avatar"
                                    type="url"
                                    dir="ltr"
                                    placeholder="https://..."
                                    value={form.avatarUrl}
                                    onChange={(e) => set("avatarUrl")(e.target.value)}
                                />
                            </Field>
                        </div>

                        <FieldError>{error}</FieldError>
                    </FieldGroup>

                    <DialogFooter>
                        <Button type="submit" disabled={!canSave || isPending}>
                            {isPending ? "صبر کنید..." : "افزودن"}
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            disabled={isPending}
                            onClick={() => handleOpenChange(false)}
                        >
                            انصراف
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}