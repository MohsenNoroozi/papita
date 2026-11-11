"use client"

import Image from "next/image"
import { LoginForm } from "@/components/login-form"

export default function LoginPage() {
  return (
    <main className="h-screen w-screen overflow-hidden bg-white">
      <div className="relative grid h-full w-full overflow-hidden lg:grid-cols-2">
        <section className="relative overflow-hidden text-white">
          <div className="absolute top-[-7%] left-0 h-[110%] w-[110%] bg-brand-deep lg:rounded-tl-[50%]" />
          <div className="absolute top-[-25%] right-[-18%] h-[75%] w-[75%] rounded-full bg-brand-dark" />
          <div className="absolute bottom-[-35%] left-[-18%] h-[75%] w-[75%] rounded-full bg-brand-green" />
          <div className="absolute right-[-22%] bottom-[-30%] h-[48%] w-[48%] rounded-full bg-white" />
          <div className="relative flex h-full flex-col items-center justify-center px-8 text-center">
            <div className="@container flex flex-row-reverse w-full max-w-lg min-w-sm items-center justify-center gap-3">
              <Image
                src="/images/logo.png"
                alt="پروفایل کاربر"
                width={256}
                height={256}
                className="h-[25cqw] max-h-svw w-[25cqw] max-w-sm object-contain"
              />
              <div>
                <h1
                  className="pointer-events-none flex h-[12cqw] cursor-default items-center text-[clamp(1rem,17cqw,6rem)] leading-none font-black tracking-wide text-white select-none"
                  aria-hidden="true"
                >
                  PAPITA
                </h1>
                <div
                  className="pointer-events-none flex flex-row-reverse cursor-default gap-3 text-[clamp(.5rem,3.5cqw,2rem)] tracking-wider text-white/50 select-none"
                  aria-hidden="true"
                >
                  <span>Learn in Steps</span>
                  <span>•</span>
                  <span>Practice in Reps</span>
                </div>
              </div>
            </div>
            <div className="mt-8 w-full max-w-lg min-w-sm rounded-3xl bg-white p-8 lg:hidden">
              <LoginForm />
            </div>
          </div>
        </section>

        <section className="relative hidden items-center justify-center overflow-hidden bg-brand-deep lg:flex">
          <div className="absolute top-[-7%] right-0 bottom-0 left-0 rounded-tl-[50%] bg-white" />
          <div className="relative w-full max-w-90 px-10">
            <LoginForm />
          </div>
        </section>
      </div>
    </main>
  )
}
