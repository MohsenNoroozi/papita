import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export const DEFAULT_AVATAR = "/images/default-avatar.svg"

// اگر آواتار نباشد یا آدرسش خراب باشد، تصویر پیش‌فرض نمایش داده می‌شود
export function UserAvatar({ src, className }: { src?: string | null; className?: string }) {
    return (
        <Avatar className={className}>
            {src && <AvatarImage src={src} alt="" />}
            <AvatarFallback className="overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={DEFAULT_AVATAR} alt="" className="size-full object-cover" />
            </AvatarFallback>
        </Avatar>
    )
}