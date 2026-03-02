"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth-context"
import { updateOrgFeatures } from "@/lib/actions/org"
import {
  ArrowLeft,
  ArrowRight,
  MessageSquare,
  LayoutDashboard,
  TrendingUp,
  Factory,
  Megaphone,
  ExternalLink,
  Loader2,
  Check,
} from "lucide-react"

export interface EnabledFeatures {
  chat: boolean
  dashboard: boolean
  sales: boolean
  production: boolean
  marketing: boolean
}

const DEFAULT_FEATURES: EnabledFeatures = {
  chat: true,
  dashboard: true,
  sales: true,
  production: true,
  marketing: false, // Coming soon
}

interface StepFeaturesProps {
  onComplete: (enabledCRM: boolean) => void
  onBack: () => void
}

export function StepFeatures({ onComplete, onBack }: StepFeaturesProps) {
  const { org, refreshOrg } = useAuth()
  const [features, setFeatures] = useState<EnabledFeatures>(() => ({
    ...DEFAULT_FEATURES,
    ...(org?.enabled_features as Partial<EnabledFeatures> || {}),
  }))
  const [isSaving, setIsSaving] = useState(false)

  const toggleFeature = (key: keyof EnabledFeatures) => {
    if (key === "chat") return // Chat is always enabled
    setFeatures(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const hasCRMEnabled = features.dashboard || features.sales || features.production || features.marketing

  const handleContinue = async () => {
    setIsSaving(true)
    const result = await updateOrgFeatures(features)
    if (result.success) {
      await refreshOrg()
      onComplete(hasCRMEnabled)
    }
    setIsSaving(false)
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-foreground">
          Customize Your Experience
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Select which features you want to use. You can always change these later in Settings if you are an admin.
        </p>
      </div>

      {/* Chat Section */}
      <div className="rounded-lg border border-border bg-card p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
            <MessageSquare className="size-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Chat Features</h3>
            <p className="text-xs text-muted-foreground">AI-powered assistance for your Hover projects</p>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-muted/30 p-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex size-5 items-center justify-center rounded bg-primary text-primary-foreground">
              <Check className="size-3" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-foreground text-sm">AI Chat Assistant</p>
              <p className="text-xs text-muted-foreground mt-1">
                Chat with an AI assistant that can access your Hover jobs, measurements, and photos. 
                Ask questions about your projects, get measurement details, and receive intelligent 
                suggestions for your roofing and exterior work.
              </p>
            </div>
            <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">Always on</span>
          </div>
        </div>
      </div>

      {/* CRM Section */}
      <div className="rounded-lg border border-border bg-card p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
            <LayoutDashboard className="size-5 text-muted-foreground" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">CRM Features</h3>
            <p className="text-xs text-muted-foreground">Lightweight project management tools</p>
          </div>
        </div>

        <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/30 p-4 mb-4">
          <p className="text-sm text-amber-800 dark:text-amber-200">
            These are lightweight CRM features included in case your company does not already have a CRM. 
            If you use an existing CRM that is a Hover partner, we encourage you to check out the{" "}
            <a 
              href="https://hover.to/integrations" 
              target="_blank" 
              rel="noopener noreferrer"
              className="font-medium underline underline-offset-2 hover:no-underline"
            >
              Hover Integrations page
              <ExternalLink className="inline size-3 ml-1" />
            </a>
          </p>
          <p className="text-sm text-amber-800 dark:text-amber-200 mt-2">
            Hover would be happy to broker an introduction to any of these partners if you are not already using one, 
            or you can simply check the boxes below to include CRM features in your account.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <FeatureToggle
            icon={<LayoutDashboard className="size-4" />}
            title="Dashboard"
            description="Overview of your jobs, metrics, and recent activity at a glance."
            enabled={features.dashboard}
            onToggle={() => toggleFeature("dashboard")}
          />
          <FeatureToggle
            icon={<TrendingUp className="size-4" />}
            title="Sales Pipeline"
            description="Kanban board to track jobs through your sales process from lead to approval."
            enabled={features.sales}
            onToggle={() => toggleFeature("sales")}
          />
          <FeatureToggle
            icon={<Factory className="size-4" />}
            title="Production Pipeline"
            description="Manage approved jobs through scheduling, installation, and completion."
            enabled={features.production}
            onToggle={() => toggleFeature("production")}
          />
          <FeatureToggle
            icon={<Megaphone className="size-4" />}
            title="Marketing"
            description="Coming soon - Tools to help generate leads and grow your business."
            enabled={features.marketing}
            onToggle={() => toggleFeature("marketing")}
            comingSoon
          />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="size-4" />
          Back
        </Button>
        <Button onClick={handleContinue} disabled={isSaving}>
          {isSaving ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <>
              Continue
              <ArrowRight className="size-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

interface FeatureToggleProps {
  icon: React.ReactNode
  title: string
  description: string
  enabled: boolean
  onToggle: () => void
  comingSoon?: boolean
}

function FeatureToggle({ icon, title, description, enabled, onToggle, comingSoon }: FeatureToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={comingSoon}
      className={`flex items-start gap-3 rounded-lg border p-4 text-left transition-colors ${
        enabled 
          ? "border-primary bg-primary/5" 
          : "border-border bg-muted/30 hover:bg-muted/50"
      } ${comingSoon ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
    >
      <div className={`mt-0.5 flex size-5 items-center justify-center rounded ${
        enabled ? "bg-primary text-primary-foreground" : "border border-border bg-background"
      }`}>
        {enabled && <Check className="size-3" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">{icon}</span>
          <span className="font-medium text-foreground text-sm">{title}</span>
          {comingSoon && (
            <span className="text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
              Coming Soon
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </div>
    </button>
  )
}
