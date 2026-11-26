import { HugeiconsIcon } from "@hugeicons/react"
import { MusicNote01Icon, Video01Icon } from "@hugeicons/core-free-icons"

import type { MediaType } from "@/lib/media"

export function MediaTypeIcon({
                                  type,
                                  size = 40,
                                  className,
                              }: {
    type: MediaType
    size?: number
    className?: string
}) {
    return (
        <HugeiconsIcon
            icon={type === "video" ? Video01Icon : MusicNote01Icon}
            size={size}
            aria-hidden="true"
            className={className}
        />
    )
}