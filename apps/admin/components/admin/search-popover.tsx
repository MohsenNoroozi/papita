"use client"

import { Search01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

export function SearchPopover() {
    return (
        <Popover>
            <PopoverTrigger
                render={<Button variant="ghost" size="icon" aria-label="جستجو" />}
            >
                <HugeiconsIcon icon={Search01Icon} size={20} />
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80">
                <Input type="search" placeholder="جستجو..." autoFocus />
            </PopoverContent>
        </Popover>
    )
}