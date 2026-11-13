import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Card, CardContent } from "@/components/ui/card"
import { UserAvatar } from "@/components/users/user-avatar"
import { getUser } from "@/lib/data/users"

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const nf = new Intl.NumberFormat("fa-IR")

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { id } = await params
    const user = UUID_RE.test(id) ? await getUser(id) : null
    return { title: user?.fullname ?? "کاربر" }
}

export default async function UserPage({ params }: Props) {
    const { id } = await params
    if (!UUID_RE.test(id)) notFound()

    const user = await getUser(id)
    if (!user) notFound()

    const empty = <span className="text-muted-foreground">—</span>

    return (
        <div className="space-y-4">
            <div>
                <h1 className="text-xl font-bold">جزئیات کاربر</h1>
                <Breadcrumb className="mt-1">
                    <BreadcrumbList>
                        <BreadcrumbItem>
                            <BreadcrumbLink render={<Link href="/dashboard" />}>خانه</BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator className="rtl:rotate-180" />
                        <BreadcrumbItem>
                            <BreadcrumbLink render={<Link href="/users" />}>لیست کاربران</BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator className="rtl:rotate-180" />
                        <BreadcrumbItem>
                            <BreadcrumbPage>{user.fullname}</BreadcrumbPage>
                        </BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>
            </div>

            <Card className="shadow-none">
                <CardContent className="space-y-6">
                    <div className="flex items-center gap-5">
                        <UserAvatar src={user.avatarUrl} className="size-20" />
                        <h2 dir="auto" className="text-3xl leading-tight font-black">
                            {user.fullname}
                        </h2>
                    </div>

                    <dl className="grid gap-4 sm:grid-cols-3">
                        <div className="space-y-1">
                            <dt className="text-xs text-muted-foreground">ایمیل</dt>
                            <dd dir="ltr" className="text-start">{user.email}</dd>
                        </div>
                        <div className="space-y-1">
                            <dt className="text-xs text-muted-foreground">شماره تلفن</dt>
                            <dd dir="ltr" className="text-start">{user.phone ?? empty}</dd>
                        </div>
                        <div className="space-y-1">
                            <dt className="text-xs text-muted-foreground">سن</dt>
                            <dd>{user.age != null ? nf.format(user.age) : empty}</dd>
                        </div>
                    </dl>
                </CardContent>
            </Card>
        </div>
    )
}