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

interface EnabledFeatures {
  chat: boolean
  dashboard: boolean
  sales: boolean
  production: boolean
  marketing: boolean
}

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
  adminOnly?: boolean
  featureKey?: keyof EnabledFeatures
}

const navItems: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    featureKey: "dashboard",
  },
  {
    label: "Chat",
    href: "/chat",
    icon: MessageSquare,
    featureKey: "chat",
  },
  {
    label: "Marketing",
    href: "/marketing",
    icon: Megaphone,
    featureKey: "marketing",
  },
  {
    label: "Sales",
    href: "/sales",
    icon: DollarSign,
    featureKey: "sales",
  },
  {
    label: "Production",
    href: "/production",
    icon: Wrench,
    featureKey: "production",
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
  const { isAdmin, org } = useAuth()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  // Get enabled features from org, defaulting to all enabled if not set
  const enabledFeatures: EnabledFeatures = (org?.enabled_features as EnabledFeatures) || {
    chat: true,
    dashboard: true,
    sales: true,
    production: true,
    marketing: false,
  }

  const filteredItems = navItems.filter((item) => {
    // Filter by admin role
    if (item.adminOnly && !isAdmin) return false
    // Filter by enabled features (items without featureKey are always shown)
    if (item.featureKey && !enabledFeatures[item.featureKey]) return false
    return true
  })

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
