import type { Metadata } from "next"
import { getUsers } from "@/lib/data/users"
import { UsersTable } from "./users-table"

export const metadata: Metadata = { title: "کاربران" }

export default async function UsersPage() {
    const users = await getUsers()

    return (
        <div className="space-y-6 p-1">
            <h1 className="text-2xl font-bold">کاربران</h1>
            <UsersTable users={users} />
        </div>
    )
}