"use client"

import { useEffect, useState, use } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { acceptInvite } from "@/lib/actions/invite"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2, CheckCircle2, AlertCircle, UserPlus } from "lucide-react"
import Image from "next/image"

export default function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = use(params)
  const { user, isLoading, refreshOrg } = useAuth()
  const router = useRouter()
  const [status, setStatus] = useState<"loading" | "accepting" | "success" | "error">("loading")
  const [errorMsg, setErrorMsg] = useState("")

  useEffect(() => {
    if (isLoading) return

    if (!user) {
      // Store the invite token and redirect to sign-up
      sessionStorage.setItem("pending_invite", token)
      router.replace(`/auth/sign-up?invite=${token}`)
      return
    }

    // User is logged in, accept the invite
    const doAccept = async () => {
      setStatus("accepting")
      const result = await acceptInvite(token)
      if (result.error) {
        setErrorMsg(result.error)
        setStatus("error")
      } else {
        await refreshOrg()
        setStatus("success")
      }
    }
    doAccept()
  }, [user, isLoading, token, router, refreshOrg])

  if (isLoading || status === "loading" || status === "accepting") {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center bg-background px-4">
        <Image
          src="/images/hover-ninja-logo.png"
          alt="Hover Ninja logo"
          width={64}
          height={64}
          className="mb-4 w-16"
        />
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
        <p className="mt-3 text-sm text-muted-foreground">
          {status === "accepting" ? "Joining organization..." : "Loading..."}
        </p>
      </div>
    )
  }

  if (status === "error") {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background px-4">
        <Card className="w-full max-w-sm">
          <CardContent className="flex flex-col items-center gap-4 pt-6">
            <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10">
              <AlertCircle className="size-6 text-destructive" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-foreground">
                Unable to join
              </p>
              <p className="mt-1 text-sm text-muted-foreground text-balance">
                {errorMsg}
              </p>
            </div>
            <Button variant="outline" onClick={() => router.push("/chat")}>
              Go to Hover Ninja
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">
        <CardContent className="flex flex-col items-center gap-4 pt-6">
          <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
            <CheckCircle2 className="size-6 text-primary" />
          </div>
          <div className="text-center">
            <p className="font-semibold text-foreground">
              {"You're in!"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground text-balance">
              You have successfully joined the organization.
            </p>
          </div>
          <Button onClick={() => router.push("/chat")}>
            <UserPlus className="size-4" />
            Start chatting
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
