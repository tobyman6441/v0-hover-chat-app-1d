"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAuth } from "@/lib/auth-context"
import {
  Menu,
  MessageSquare,
  LayoutDashboard,
  Megaphone,
  DollarSign,
  Wrench,
  Settings,
  Users,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
  adminOnly?: boolean
}

const navItems: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Chat",
    href: "/chat",
    icon: MessageSquare,
  },
  {
    label: "Marketing",
    href: "/marketing",
    icon: Megaphone,
  },
  {
    label: "Sales",
    href: "/sales",
    icon: DollarSign,
  },
  {
    label: "Production",
    href: "/production",
    icon: Wrench,
  },
  {
    label: "Team",
    href: "/settings/team",
    icon: Users,
    adminOnly: true,
  },
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
  },
]

export function NavMenu() {
  const { isAdmin } = useAuth()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  const filteredItems = navItems.filter(
    (item) => !item.adminOnly || isAdmin
  )

  const isActive = (href: string) => {
    if (href === "/chat") {
      return pathname === "/chat" || pathname.startsWith("/chat/")
    }
    return pathname === href || pathname.startsWith(href + "/")
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-8 shrink-0"
          aria-label="Open navigation menu"
        >
          <Menu className="size-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-56"
        sideOffset={8}
      >
        {filteredItems.map((item, index) => {
          const Icon = item.icon
          const active = isActive(item.href)
          
          // Add separator before Settings
          const showSeparator = item.label === "Team" || (item.label === "Settings" && !filteredItems.some(i => i.label === "Team"))
          
          return (
            <div key={item.href}>
              {showSeparator && index > 0 && <DropdownMenuSeparator />}
              <DropdownMenuItem asChild>
                <Link
                  href={item.href}
                  className={cn(
                    "flex w-full cursor-pointer items-center gap-3",
                    active && "bg-accent"
                  )}
                  onClick={() => setOpen(false)}
                >
                  <Icon className="size-4" />
                  <span>{item.label}</span>
                </Link>
              </DropdownMenuItem>
            </div>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
