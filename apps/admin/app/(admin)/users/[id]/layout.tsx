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
import { Card } from "@/components/ui/card"
import { UserAvatar } from "@/components/users/user-avatar"
import { UserTabs } from "@/components/users/user-tabs"
import { getUser } from "@/lib/data/users"
import { levelLabel } from "@/lib/levels"
import { isUuid } from "@/lib/uuid"

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { id } = await params
    const user = isUuid(id) ? await getUser(id) : null
    return { title: user?.fullname ?? "کاربر" }
}

export default async function UserLayout({
                                             children,
                                             params,
                                         }: Props & { children: React.ReactNode }) {
    const { id } = await params
    if (!isUuid(id)) notFound()

    const user = await getUser(id)
    if (!user) notFound()

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

            {/* کارت عنوان: بدون padding عمودی تا خط زیر تب فعال روی border پایین کارت بنشیند */}
            <Card className="gap-0 overflow-hidden py-0 shadow-none">
                <div className="flex items-center gap-5 p-6">
                    <UserAvatar src={user.avatarUrl} className="size-20 shrink-0" />
                    <div className="space-y-1">
                        <h2 dir="auto" className="text-3xl leading-tight font-black">
                            {user.fullname}
                        </h2>
                        <p className="text-sm text-muted-foreground">
                            سطح: <span dir="ltr" className="inline-block font-medium text-foreground">{levelLabel(user.level)}</span>
                        </p>
                    </div>
                </div>

                <div className="mx-6">
                    <UserTabs userId={user.id} />
                </div>
            </Card>

            {children}
        </div>
    )
}