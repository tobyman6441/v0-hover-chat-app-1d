"use client"

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  useMemo,
  type ReactNode,
} from "react"
import { createClient } from "@/lib/supabase/client"
import type { User } from "@supabase/supabase-js"

export type LLMProvider =
  | "openai"
  | "anthropic"
  | "google"
  | "mistral"
  | "groq"
  | "deepseek"

export interface OrgData {
  id: string
  name: string
  llm_provider: LLMProvider | null
  llm_api_key_encrypted: string | null
  hover_access_token: string | null
  hover_refresh_token: string | null
  hover_connected_at: string | null
  onboarding_complete: boolean
}

export interface MemberData {
  id: string
  user_id: string
  org_id: string
  role: "admin" | "member"
}

interface AuthContextValue {
  user: User | null
  org: OrgData | null
  member: MemberData | null
  isLoading: boolean
  isAdmin: boolean
  refreshOrg: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [org, setOrg] = useState<OrgData | null>(null)
  const [member, setMember] = useState<MemberData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const supabase = useMemo(() => createClient(), [])
  const userRef = useRef<User | null>(null)

  useEffect(() => {
    userRef.current = user
  }, [user])

  const fetchOrgData = useCallback(
    async (userId: string) => {
      const { data, error } = await supabase.rpc("get_user_org", {
        requesting_user_id: userId,
      })

      if (error || !data) {
        setMember(null)
        setOrg(null)
        return
      }

      if (data.member) setMember(data.member)
      if (data.org) setOrg(data.org)
    },
    [supabase],
  )

  const refreshOrg = useCallback(async () => {
    const currentUser = userRef.current
    if (currentUser) {
      await fetchOrgData(currentUser.id)
    }
  }, [fetchOrgData])

  useEffect(() => {
    let initialLoadDone = false

    const getInitialSession = async () => {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser()

      setUser(currentUser)

      if (currentUser) {
        await fetchOrgData(currentUser.id)
      }

      initialLoadDone = true
      setIsLoading(false)
    }

    getInitialSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      // Skip events during initial load to avoid race conditions
      if (!initialLoadDone) return

      const newUser = session?.user ?? null
      setUser(newUser)

      if (newUser) {
        await fetchOrgData(newUser.id)
      } else {
        setOrg(null)
        setMember(null)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase, fetchOrgData])

  const isAdmin = member?.role === "admin"

  return (
    <AuthContext.Provider
      value={{ user, org, member, isLoading, isAdmin, refreshOrg }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
