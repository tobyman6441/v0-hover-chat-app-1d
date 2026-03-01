"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Loader2, Megaphone } from "lucide-react"
import Image from "next/image"
import { NavMenu } from "@/components/navigation/nav-menu"

export default function MarketingPage() {
  const { user, org, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (isLoading) return
    if (!user) {
      router.replace("/auth/login")
      return
    }
    if (!org || !org.onboarding_complete) {
      router.replace("/setup")
      return
    }
  }, [user, org, isLoading, router])

  if (isLoading || !user || !org?.onboarding_complete) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex min-h-svh flex-col bg-background">
      {/* Header */}
      <header className="flex items-center gap-3 border-b border-border px-4 py-4">
        <NavMenu />
        <div className="flex items-center gap-2">
          <Image
            src="/images/hover-ninja-logo.png"
            alt="Hover Ninja logo"
            width={28}
            height={28}
            className="size-7"
          />
          <span className="text-sm font-semibold text-foreground">Hover Ninja<sup className="ml-0.5 text-[10px] font-medium text-muted-foreground">ALPHA</sup></span>
        </div>
        <span className="text-muted-foreground">/</span>
        <h1 className="text-sm font-medium text-foreground">Marketing</h1>
      </header>

      {/* Content - Coming Soon */}
      <main className="flex flex-1 items-center justify-center p-6">
        <div className="text-center">
          <div className="mx-auto flex size-20 items-center justify-center rounded-full bg-muted">
            <Megaphone className="size-10 text-muted-foreground" />
          </div>
          <h2 className="mt-6 text-xl font-semibold text-foreground">
            Marketing Coming Soon
          </h2>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            Track your marketing campaigns, manage leads, and measure ROI all in one place.
          </p>
        </div>
      </main>
    </div>
  )
}
