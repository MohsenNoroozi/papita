"use client"

import { useTransition } from "react"
import { Logout01Icon, UserIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { signOut } from "@/lib/actions/auth"

export type AdminUser = {
    name: string
    email: string
    avatar: string | null
}

function UserAvatar({ user, className }: { user: AdminUser; className?: string }) {
    return (
        <Avatar className={className}>
            {user.avatar && <AvatarImage src={user.avatar} alt="" />}
            <AvatarFallback className="bg-gray-200 text-gray-500">
                <HugeiconsIcon icon={UserIcon} size={20} />
            </AvatarFallback>
        </Avatar>
    )
}

export function UserMenu({ user }: { user: AdminUser }) {
    const [pending, startTransition] = useTransition()

    return (
        <DropdownMenu>
            <DropdownMenuTrigger
                render={
                    <Button variant="ghost" aria-label="منوی کاربر" className="size-10 p-0" />
                }
            >
                <UserAvatar user={user} className="size-9" />
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-72">
                {/* در Base UI، Label باید داخل Group باشد */}
                <DropdownMenuGroup>
                    <DropdownMenuLabel className="flex items-center gap-3 p-2">
                        <UserAvatar user={user} className="size-12" />
                        <div className="grid min-w-0">
              <span className="truncate text-base font-bold text-foreground">
                {user.name}
              </span>
                            <span dir="ltr" className="truncate text-start text-xs text-muted-foreground">
                {user.email}
              </span>
                        </div>
                    </DropdownMenuLabel>
                </DropdownMenuGroup>

                <DropdownMenuSeparator />
                <DropdownMenuItem disabled>پروفایل من</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                    disabled={pending}
                    onClick={() => startTransition(() => signOut())}
                >
                    <HugeiconsIcon icon={Logout01Icon} size={18} />
                    خروج
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}