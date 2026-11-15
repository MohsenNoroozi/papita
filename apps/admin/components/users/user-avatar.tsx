import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { resolveAvatarUrl } from "@/lib/avatar"

export const DEFAULT_AVATAR = "/images/default-avatar.svg"

// src = مقدار خام ستون avatar_url (مسیر یا آدرس کامل)
export function UserAvatar({ src, className }: { src?: string | null; className?: string }) {
    const url = resolveAvatarUrl(src)

    return (
        <Avatar className={className}>
            {url && <AvatarImage key={url} src={url} alt="" />}
            <AvatarFallback className="overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={DEFAULT_AVATAR} alt="" className="size-full object-cover" />
            </AvatarFallback>
        </Avatar>
    )
}