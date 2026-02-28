import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { AlertCircle } from "lucide-react"

export default function AuthErrorPage() {
  return (
    <div className="flex min-h-svh items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">
        <CardContent className="flex flex-col items-center gap-4 pt-6">
          <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertCircle className="size-6 text-destructive" />
          </div>
          <div className="text-center">
            <p className="font-semibold text-foreground">
              Something went wrong
            </p>
            <p className="mt-1 text-sm text-muted-foreground text-balance">
              We could not verify your account. The link may have expired or
              already been used.
            </p>
          </div>
          <Link href="/auth/login">
            <Button variant="outline">Back to sign in</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
