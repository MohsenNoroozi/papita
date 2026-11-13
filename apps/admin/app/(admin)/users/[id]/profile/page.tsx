import { notFound } from "next/navigation"

import { AvatarCard } from "@/components/users/avatar-card"
import { ProfileForm } from "@/components/users/profile-form"
import { getUser } from "@/lib/data/users"
import { isUuid } from "@/lib/uuid"

export default async function UserProfilePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    if (!isUuid(id)) notFound()

    const user = await getUser(id)
    if (!user) notFound()

    return (
        // در RTL ستون اول (انعطاف‌پذیر) سمت راست و ستون دوم (۳۰۰ پیکسل ثابت) سمت چپ می‌نشیند
        <div className="grid items-start gap-4 lg:grid-cols-[1fr_300px]">
            <ProfileForm
                user={{
                    id: user.id,
                    fullname: user.fullname,
                    email: user.email,
                    phone: user.phone,
                    age: user.age,
                    level: user.level,
                }}
            />
            {/* در موبایل آواتار بالاتر از فرم دیده شود */}
            <AvatarCard
                userId={user.id}
                fullname={user.fullname}
                avatarUrl={user.avatarUrl}
                className="order-first lg:order-none"
            />
        </div>
    )
}