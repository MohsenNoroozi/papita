import Link from "next/link"
import { notFound } from "next/navigation"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowUpRight01Icon, Book02Icon } from "@hugeicons/core-free-icons"

import { ListOrderedAzIcon } from "@hugeicons/core-free-icons"
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import {
    Item,
    ItemMedia,
    ItemContent,
    ItemDescription,
    ItemTitle,
} from "@/components/ui/item"
import { Card } from "@/components/ui/card"
import { SourceTabs } from "@/components/sources/source-tabs"
import { getSource } from "@/lib/data/sources"

export default async function SourceLayout({
                                               children,
                                               params,
                                           }: {
    children: React.ReactNode
    params: Promise<{ id: string }>
}) {
    const { id } = await params
    const sourceId = Number(id)
    if (!Number.isInteger(sourceId) || sourceId <= 0) notFound()

    const source = await getSource(sourceId)
    if (!source) notFound()

    const nf = new Intl.NumberFormat("fa-IR")

    return (
        <div className="space-y-4">
            <div>
                <h1 className="text-xl font-bold">جزئیات منبع</h1>
                <Breadcrumb className="mt-1">
                    <BreadcrumbList>
                        <BreadcrumbItem>
                            <BreadcrumbLink render={<Link href="/dashboard" />}>خانه</BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator className="rtl:rotate-180" />
                        <BreadcrumbItem>
                            <BreadcrumbLink render={<Link href="/sources" />}>لیست منابع</BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator className="rtl:rotate-180" />
                        <BreadcrumbItem>
                            <BreadcrumbPage>شناسه: {nf.format(source.id)}</BreadcrumbPage>
                        </BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>
            </div>

            {/* کارت عنوان: بدون padding عمودی تا خط زیر تب فعال روی border پایین کارت بنشیند */}
            <Card className="gap-0 overflow-hidden py-0 shadow-none">
                <div className="flex flex-wrap items-center justify-between gap-6 p-6">
                    <div className="flex items-center gap-5">
                        <div className="flex size-20 shrink-0 items-center justify-center rounded-2xl bg-brand-deep/10 text-brand-deep">
                            <HugeiconsIcon icon={Book02Icon} size={40} aria-hidden="true" />
                        </div>
                        <div className="space-y-1">
                            <h2 dir="auto" className="text-3xl leading-tight font-black">
                                {source.title}
                            </h2>
                            {source.collectionId && source.collectionTitle && (
                                <Link
                                    href={`/collections/${source.collectionId}`}
                                    className="inline-flex items-center gap-1 text-sm text-brand-deep hover:underline"
                                >
                                    {source.collectionTitle}
                                    <HugeiconsIcon icon={ArrowUpRight01Icon} size={14} aria-hidden="true" />
                                </Link>
                            )}
                        </div>
                    </div>

                    <div>
                        <Item variant="outline" className="border-dashed">
                            <ItemMedia variant="icon" className="[&_svg]:size-8! mt-1 text-gray-500">
                                <HugeiconsIcon icon={ListOrderedAzIcon} size={54} aria-hidden="true" />
                            </ItemMedia>
                            <ItemContent>
                                <ItemTitle className="text-2xl leading-none font-black">{nf.format(source.wordCount)}</ItemTitle>
                                <ItemDescription>تعداد واژه‌ها</ItemDescription>
                            </ItemContent>
                        </Item>
                    </div>
                </div>

                <div className="mx-6">
                    <SourceTabs sourceId={source.id} />
                </div>
            </Card>

            {children}
        </div>
    )
}
