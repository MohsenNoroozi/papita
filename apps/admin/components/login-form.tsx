"use client"

import { useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Login01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { createClient } from "@/lib/supabase/client"

export function LoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (loading) return

    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    if (error) {
      setError(
          error.status === 400
              ? "ایمیل یا رمز عبور اشتباه است"
              : "مشکلی پیش آمد؛ دوباره تلاش کنید"
      )
      setLoading(false)
      return
    }

    router.replace("/dashboard")
    router.refresh()
  }

  return (
      <>
        <div className="mb-8 text-center">
          <div className="mb-8 flex justify-center">
            <div className="relative h-28 w-28 overflow-hidden rounded-full border-4 border-brand-border bg-white">
              <Image
                  src="/images/user.svg"
                  alt="پروفایل کاربر"
                  width={72}
                  height={72}
                  className="absolute top-0 left-1/2 h-full w-full max-w-none -translate-x-1/2 object-contain"
              />
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
              type="email"
              name="email"
              placeholder="نام کاربری"
              autoComplete="username"
              autoFocus
              required
              dir="ltr"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-12 rounded-full border-0 bg-gray-200 px-6 text-left text-sm text-black shadow-none placeholder:text-right placeholder:text-gray-400 focus-visible:ring-1 focus-visible:ring-brand-deep"
          />
          <Input
              type="password"
              name="password"
              placeholder="رمز عبور"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-12 rounded-full border-0 bg-gray-200 px-6 text-left text-sm text-black shadow-none placeholder:text-right placeholder:text-gray-400 focus-visible:ring-1 focus-visible:ring-brand-deep"
          />

          {error && (
              <p role="alert" className="px-4 text-center text-sm text-red-500">
                {error}
              </p>
          )}

          <div className="flex px-4">
            <button type="button" className="text-xs text-gray-400 hover:text-brand-deep">
              بازیابی رمز عبور
            </button>
          </div>
          <div className="flex justify-center pt-3">
            <Button
                type="submit"
                disabled={loading}
                className="h-11 w-36 rounded-full bg-brand-deep text-lg font-medium text-primary-foreground shadow-none hover:bg-primary/80"
            >
              <HugeiconsIcon icon={Login01Icon} size={20} aria-hidden="true" />
              {loading ? "صبر کنید..." : "ورود"}
            </Button>
          </div>
        </form>

        <p className="mt-8 text-center text-xs text-gray-400">
          حساب کاربری ندارید؟{" "}
          <button type="button" className="font-bold text-brand-deep hover:underline">
            ثبت نام کنید
          </button>
        </p>
      </>
  )
}