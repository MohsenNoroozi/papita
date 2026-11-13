"use client"

import { useState, useTransition, type FormEvent } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { LevelPicker } from "@/components/sources/cell-editor"
import { ChangePasswordDialog } from "@/components/users/change-password-dialog"
import { DeleteUserButton } from "@/components/users/delete-user-button"
import { updateUserProfile } from "@/app/(admin)/users/[id]/actions"

type Props = {
    user: {
        id: string
        fullname: string
        email: string
        phone: string | null
        age: number | null
        level: number
    }
}

export function ProfileForm({ user }: Props) {
    const initial = {
        fullname: user.fullname,
        email: user.email,
        phone: user.phone ?? "",
        age: user.age != null ? String(user.age) : "",
        level: String(user.level),
    }
    const [form, setForm] = useState(initial)
    const [pending, startTransition] = useTransition()

    const set = (k: keyof typeof initial) => (v: string) => setForm((s) => ({ ...s, [k]: v }))
    const dirty = (Object.keys(initial) as (keyof typeof initial)[]).some((k) => form[k].trim() !== initial[k])
    const valid = form.fullname.trim() !== "" && form.email.trim() !== ""

    function handleSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault()
        if (!valid || !dirty || pending) return

        startTransition(async () => {
            const res = await updateUserProfile(user.id, form)
            if (res.ok) toast.success("مشخصات کاربر ذخیره شد")
            else toast.error(res.error)
        })
    }

    return (
        <Card className="shadow-none">
            <CardHeader>
                <CardTitle>مشخصات</CardTitle>
            </CardHeader>

            <CardContent>
                <form onSubmit={handleSubmit}>
                    <FieldGroup>
                        <div className="grid gap-4 md:grid-cols-2">
                            <Field>
                                <FieldLabel htmlFor="profile-fullname">نام</FieldLabel>
                                <Input
                                    id="profile-fullname"
                                    required
                                    maxLength={100}
                                    value={form.fullname}
                                    onChange={(e) => set("fullname")(e.target.value)}
                                />
                            </Field>

                            <Field>
                                <FieldLabel htmlFor="profile-email">ایمیل</FieldLabel>
                                <Input
                                    id="profile-email"
                                    type="email"
                                    dir="ltr"
                                    required
                                    value={form.email}
                                    onChange={(e) => set("email")(e.target.value)}
                                />
                            </Field>

                            <Field>
                                <FieldLabel htmlFor="profile-phone">شماره تلفن</FieldLabel>
                                <Input
                                    id="profile-phone"
                                    type="tel"
                                    dir="ltr"
                                    inputMode="tel"
                                    value={form.phone}
                                    onChange={(e) => set("phone")(e.target.value)}
                                />
                            </Field>

                            <Field>
                                <FieldLabel htmlFor="profile-age">سن</FieldLabel>
                                <Input
                                    id="profile-age"
                                    inputMode="numeric"
                                    maxLength={3}
                                    value={form.age}
                                    onChange={(e) => set("age")(e.target.value)}
                                />
                            </Field>

                            <Field className="md:col-span-2">
                                <FieldLabel>سطح</FieldLabel>
                                <LevelPicker value={form.level} onChange={set("level")} />
                            </Field>
                        </div>

                        <div>
                            <Button type="submit" disabled={!dirty || !valid || pending} className="bg-brand-deep px-8">
                                {pending ? "در حال ذخیره..." : "ذخیره تغییرات"}
                            </Button>
                        </div>
                    </FieldGroup>
                </form>
            </CardContent>

            {/* بیرون از <form> تا دکمه‌ها به‌اشتباه submit نشوند */}
            <CardFooter className="flex flex-wrap gap-3 border-t">
                <ChangePasswordDialog userId={user.id} fullname={user.fullname} />
                <DeleteUserButton userId={user.id} fullname={user.fullname} />
            </CardFooter>
        </Card>
    )
}