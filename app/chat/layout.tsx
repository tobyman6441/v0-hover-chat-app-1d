"use client"

import {
  useEffect,
  useState,
  useCallback,
  createContext,
  useContext,
} from "react"
import { useRouter, usePathname } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { getChats } from "@/lib/actions/chat"
import { ChatSidebar } from "@/components/chat/chat-sidebar"
import { Loader2 } from "lucide-react"

interface ChatItem {
  id: string
  title: string
  updated_at: string
}

interface SidebarContextType {
  isOpen: boolean
  toggle: () => void
  close: () => void
  refreshChats: () => Promise<void>
}

const SidebarContext = createContext<SidebarContextType>({
  isOpen: false,
  toggle: () => {},
  close: () => {},
  refreshChats: async () => {},
})

export function useSidebar() {
  return useContext(SidebarContext)
}

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, org, isLoading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [chats, setChats] = useState<ChatItem[]>([])
  const [isLoadingChats, setIsLoadingChats] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const activeChatId = pathname.startsWith("/chat/")
    ? pathname.split("/chat/")[1]
    : undefined

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false)
  }, [pathname])

  const fetchChats = useCallback(async () => {
    const result = await getChats()
    setChats(result.chats)
    setIsLoadingChats(false)
  }, [])

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
    fetchChats()
  }, [user, org, isLoading, router, fetchChats])

  if (isLoading || !user || !org?.onboarding_complete) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const sidebarContext: SidebarContextType = {
    isOpen: sidebarOpen,
    toggle: () => setSidebarOpen((prev) => !prev),
    close: () => setSidebarOpen(false),
    refreshChats: fetchChats,
  }

  return (
    <SidebarContext.Provider value={sidebarContext}>
      <div className="flex h-svh bg-background">
        {/* Mobile overlay backdrop */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/50 md:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* Sidebar - slide-over on mobile, fixed on desktop */}
        <div
          className={`fixed inset-y-0 left-0 z-50 w-72 transform transition-transform duration-200 ease-in-out md:relative md:z-auto md:w-64 md:translate-x-0 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <ChatSidebar
            chats={chats}
            activeChatId={activeChatId}
            onChatsChange={fetchChats}
          />
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
      </div>
    </SidebarContext.Provider>
  )
}
