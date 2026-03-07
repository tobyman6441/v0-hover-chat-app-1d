"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import {
  getOrgMembers,
  getOrgInvitations,
  createEmailInvite,
  createShareableLink,
  removeMember,
  updateMemberRole,
} from "@/lib/actions/invite"
import { getStages, deleteStage, updateStage, type Stage, type PipelineType } from "@/lib/actions/stages"
import { disconnectLLM, disconnectHover, updateOrgFeatures, type EnabledFeatures } from "@/lib/actions/org"
import { signOut } from "@/lib/actions/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ArrowLeft,
  Check,
  Copy,
  ExternalLink,
  Factory,
  LayoutDashboard,
  Link2,
  Kanban,
  Loader2,
  LogOut,
  Mail,
  Megaphone,
  MessageSquare,
  Pencil,
  Shield,
  ToggleLeft,
  Trash2,
  TrendingUp,
  Unplug,
  User,
  UserPlus,
  Users,
} from "lucide-react"
import Image from "next/image"
import { PROVIDER_LOGOS } from "@/components/provider-logos"
import { cn } from "@/lib/utils"
import { NavMenu } from "@/components/navigation/nav-menu"

interface MemberRow {
  id: string
  user_id: string
  org_id: string
  role: "admin" | "member"
  created_at: string
  profiles: { full_name: string | null } | null
}

interface InviteRow {
  id: string
  email: string | null
  token: string
  role: "admin" | "member"
  accepted_at: string | null
  created_at: string
  expires_at: string
}

export default function SettingsPage() {
  const { user, org, isLoading, isAdmin, refreshOrg } = useAuth()
  const router = useRouter()
  const [members, setMembers] = useState<MemberRow[]>([])
  const [invitations, setInvitations] = useState<InviteRow[]>([])
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState<"admin" | "member">("member")
  const [isSendingInvite, setIsSendingInvite] = useState(false)
  const [inviteSuccess, setInviteSuccess] = useState(false)
  const [shareableLink, setShareableLink] = useState("")
  const [isGeneratingLink, setIsGeneratingLink] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [changingRoleId, setChangingRoleId] = useState<string | null>(null)
  const [isDisconnectingLLM, setIsDisconnectingLLM] = useState(false)
  const [isDisconnectingHover, setIsDisconnectingHover] = useState(false)
  const [stages, setStages] = useState<Stage[]>([])
  const [editingStageId, setEditingStageId] = useState<string | null>(null)
  const [editingStageName, setEditingStageName] = useState("")
  const [editingProbability, setEditingProbability] = useState<number>(0)
  const [editingLinkedStageId, setEditingLinkedStageId] = useState<string | null>(null)
  const [deletingStageId, setDeletingStageId] = useState<string | null>(null)
  const [activePipelineTab, setActivePipelineTab] = useState<PipelineType>("sales")
  const [features, setFeatures] = useState<EnabledFeatures>({
    chat: true,
    dashboard: true,
    sales: true,
    production: true,
    marketing: true,
  })
  const [originalFeatures, setOriginalFeatures] = useState<EnabledFeatures | null>(null)
  const [isSavingFeatures, setIsSavingFeatures] = useState(false)
  const [featuresInitialized, setFeaturesInitialized] = useState(false)

  const fetchData = useCallback(async () => {
    if (!org) return
    const [membersResult, invitesResult, stagesResult] = await Promise.all([
      getOrgMembers(org.id),
      getOrgInvitations(org.id),
      getStages(org.id),
    ])
    setMembers(membersResult.members as MemberRow[])
    setInvitations(invitesResult.invitations as InviteRow[])
    setStages(stagesResult.stages || [])
  }, [org])

  // Only load features from org on initial mount, not on every org change
  useEffect(() => {
    if (!org || featuresInitialized) return
    const orgFeatures = org.enabled_features as EnabledFeatures | null
    if (orgFeatures) {
      setFeatures(orgFeatures)
      setOriginalFeatures(orgFeatures)
    } else {
      // Set defaults if org doesn't have features set yet
      const defaultFeatures: EnabledFeatures = {
        chat: true,
        dashboard: true,
        sales: true,
        production: true,
        marketing: true,
      }
      setFeatures(defaultFeatures)
      setOriginalFeatures(defaultFeatures)
    }
    setFeaturesInitialized(true)
  }, [org, featuresInitialized])

  useEffect(() => {
    if (isLoading) return
    if (!user) {
      router.replace("/auth/login")
      return
    }
    if (!isAdmin) {
      router.replace("/chat")
      return
    }
    fetchData()
  }, [user, isLoading, isAdmin, router, fetchData])

  async function handleSendInvite(e: React.FormEvent) {
    e.preventDefault()
    if (!org || !inviteEmail.trim()) return
    setIsSendingInvite(true)
    setInviteSuccess(false)
    const result = await createEmailInvite(org.id, inviteEmail.trim(), inviteRole)
    if (!result.error) {
      setInviteSuccess(true)
      setInviteEmail("")
      fetchData()
      setTimeout(() => setInviteSuccess(false), 3000)
    }
    setIsSendingInvite(false)
  }

  async function handleGenerateLink() {
    if (!org) return
    setIsGeneratingLink(true)
    const result = await createShareableLink(org.id, inviteRole)
    if (result.link) {
      setShareableLink(result.link)
      fetchData()
    }
    setIsGeneratingLink(false)
  }

  async function handleCopyLink() {
    await navigator.clipboard.writeText(shareableLink)
    setLinkCopied(true)
    setTimeout(() => setLinkCopied(false), 2000)
  }

  async function handleRemoveMember(memberId: string) {
    setRemovingId(memberId)
    await removeMember(memberId)
    fetchData()
    setRemovingId(null)
  }

  async function handleChangeRole(memberId: string, newRole: "admin" | "member") {
    setChangingRoleId(memberId)
    await updateMemberRole(memberId, newRole)
    fetchData()
    setChangingRoleId(null)
  }

  async function handleUpdateStage(stageId: string) {
    if (!editingStageName.trim()) return
    await updateStage(stageId, { 
      name: editingStageName.trim(),
      probability: editingProbability,
      linked_stage_id: editingLinkedStageId
    })
    setEditingStageId(null)
    setEditingStageName("")
    setEditingProbability(0)
    setEditingLinkedStageId(null)
    fetchData()
  }

  async function handleDeleteStage(stageId: string) {
    setDeletingStageId(stageId)
    await deleteStage(stageId)
    fetchData()
    setDeletingStageId(null)
  }

  function handleToggleFeature(key: keyof EnabledFeatures) {
    if (key === "chat") return // Chat is always enabled
    setFeatures(prev => ({ ...prev, [key]: !prev[key] }))
  }

  async function handleSaveFeatures() {
    setIsSavingFeatures(true)
    await updateOrgFeatures(features)
    await refreshOrg()
    setOriginalFeatures(features)
    setIsSavingFeatures(false)
    // Refresh the page to update navigation menu
    router.refresh()
  }

  const featuresChanged = originalFeatures && (
    features.dashboard !== originalFeatures.dashboard ||
    features.sales !== originalFeatures.sales ||
    features.production !== originalFeatures.production ||
    features.marketing !== originalFeatures.marketing
  )

  async function handleDisconnectLLM() {
    setIsDisconnectingLLM(true)
    await disconnectLLM()
    await refreshOrg()
    setIsDisconnectingLLM(false)
  }

  async function handleDisconnectHover() {
    setIsDisconnectingHover(true)
    await disconnectHover()
    await refreshOrg()
    setIsDisconnectingHover(false)
  }

  const provider = org?.llm_provider
    ? PROVIDER_LOGOS[org.llm_provider as keyof typeof PROVIDER_LOGOS]
    : null

  if (isLoading || !org) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const pendingInvites = invitations.filter((i) => !i.accepted_at)

  return (
    <div className="min-h-svh bg-background">
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
          <span className="text-sm font-semibold text-foreground">Hover Ninja<sup className="ml-1 text-[10px] font-medium text-muted-foreground align-super">ALPHA</sup></span>
        </div>
        <span className="text-muted-foreground">/</span>
        <h1 className="text-sm font-medium text-foreground">Settings</h1>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8">
        <div className="flex flex-col gap-8">
          {/* Organization */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Shield className="size-4" />
                Organization
              </CardTitle>
              <CardDescription>{org.name}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {/* LLM Connection */}
              {provider ? (
                <div className="flex items-center gap-3 rounded-lg bg-muted p-3">
                  <provider.logo className="size-4 text-muted-foreground" />
                  <span className="flex-1 text-sm text-foreground">{provider.name}</span>
                  <Check className="size-4 text-primary" />
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={handleDisconnectLLM}
                    disabled={isDisconnectingLLM}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    {isDisconnectingLLM ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Unplug className="size-3.5" />
                    )}
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-between rounded-lg border border-dashed border-border p-3">
                  <span className="text-sm text-muted-foreground">No LLM connected</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push("/setup?step=llm")}
                  >
                    Connect
                  </Button>
                </div>
              )}

              {/* Hover Connection */}
              {org.hover_access_token ? (
                <div className="flex items-center gap-3 rounded-lg bg-muted p-3">
                  <Link2 className="size-4 text-muted-foreground" />
                  <span className="flex-1 text-sm text-foreground">Hover</span>
                  <Check className="size-4 text-primary" />
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={handleDisconnectHover}
                    disabled={isDisconnectingHover}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    {isDisconnectingHover ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Unplug className="size-3.5" />
                    )}
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-between rounded-lg border border-dashed border-border p-3">
                  <span className="text-sm text-muted-foreground">Hover not connected</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push("/setup?step=hover")}
                  >
                    Connect
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Enabled Features */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ToggleLeft className="size-4" />
                Enabled Features
              </CardTitle>
              <CardDescription>
                Choose which features to show in your account. Team members will only see enabled features.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {/* Chat Feature */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <MessageSquare className="size-4" />
                  Chat
                </div>
                <div className="rounded-lg border border-border bg-muted/30 p-3">
                  <div className="flex items-center gap-3">
                    <div className="flex size-5 items-center justify-center rounded bg-primary text-primary-foreground">
                      <Check className="size-3" />
                    </div>
                    <div className="flex-1">
                      <span className="text-sm font-medium text-foreground">AI Chat Assistant</span>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Chat with AI about your Hover jobs, measurements, and photos.
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">Always on</span>
                  </div>
                </div>
              </div>

              {/* CRM Features */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <LayoutDashboard className="size-4" />
                  CRM Features
                </div>
                <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/30 p-3 mb-1">
                  <p className="text-xs text-amber-800 dark:text-amber-200">
                    These are lightweight CRM features. If you use an existing CRM that is a Hover partner, check out the{" "}
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
                </div>
                <FeatureToggle
                  icon={<LayoutDashboard className="size-4" />}
                  title="Dashboard"
                  description="Overview of jobs, metrics, and activity"
                  enabled={features.dashboard}
                  onToggle={() => handleToggleFeature("dashboard")}
                  disabled={isSavingFeatures}
                />
                <FeatureToggle
                  icon={<Megaphone className="size-4" />}
                  title="Marketing"
                  description="View and manage leads from different sources or manually created leads"
                  enabled={features.marketing}
                  onToggle={() => handleToggleFeature("marketing")}
                  disabled={isSavingFeatures}
                />
                <FeatureToggle
                  icon={<TrendingUp className="size-4" />}
                  title="Sales Pipeline"
                  description="Kanban board for your sales process"
                  enabled={features.sales}
                  onToggle={() => handleToggleFeature("sales")}
                  disabled={isSavingFeatures}
                />
                <FeatureToggle
                  icon={<Factory className="size-4" />}
                  title="Production Pipeline"
                  description="Manage jobs through installation"
                  enabled={features.production}
                  onToggle={() => handleToggleFeature("production")}
                  disabled={isSavingFeatures}
                />
                
                {/* Save Button */}
                <div className="flex justify-end pt-2">
                  <Button
                    onClick={handleSaveFeatures}
                    disabled={!featuresChanged || isSavingFeatures}
                    size="sm"
                  >
                    {isSavingFeatures ? (
                      <>
                        <Loader2 className="mr-2 size-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save Changes"
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Team Members */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="size-4" />
                Team Members
              </CardTitle>
              <CardDescription>
                {members.length} member{members.length !== 1 ? "s" : ""}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center gap-3 rounded-lg border border-border p-3"
                >
                  <div className="flex size-8 items-center justify-center rounded-full bg-muted">
                    <User className="size-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">
                      {member.profiles?.full_name || "Unknown"}
                    </p>
                    {member.user_id === user?.id ? (
                      <p className="text-xs text-muted-foreground">
                        {member.role === "admin" ? "Admin" : "Member"}
                      </p>
                    ) : (
                      <button
                        onClick={() => handleChangeRole(
                          member.id, 
                          member.role === "admin" ? "member" : "admin"
                        )}
                        disabled={changingRoleId === member.id}
                        className="text-xs text-primary hover:underline disabled:opacity-50"
                      >
                        {changingRoleId === member.id ? (
                          "Updating..."
                        ) : (
                          `${member.role === "admin" ? "Admin" : "Member"} (click to change)`
                        )}
                      </button>
                    )}
                  </div>
                  {member.user_id === user?.id && (
                    <span className="rounded bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                      You
                    </span>
                  )}
                  {member.user_id !== user?.id && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleRemoveMember(member.id)}
                      disabled={removingId === member.id}
                    >
                      {removingId === member.id ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="size-3.5 text-muted-foreground hover:text-destructive" />
                      )}
                    </Button>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Pipeline Stages */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Kanban className="size-4" />
                Pipeline Stages
              </CardTitle>
              <CardDescription>
                Manage stages, probability weights, and cross-pipeline linking
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {/* Pipeline Type Tabs */}
              <div className="flex gap-2 border-b border-border pb-2">
                <button
                  onClick={() => setActivePipelineTab("sales")}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                    activePipelineTab === "sales"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  Sales Pipeline
                </button>
                <button
                  onClick={() => setActivePipelineTab("production")}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                    activePipelineTab === "production"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  Production Pipeline
                </button>
              </div>

              {/* Stages List */}
              <div className="flex flex-col gap-2">
                {stages
                  .filter(s => s.pipeline_type === activePipelineTab)
                  .map((stage, index) => {
                    const linkedStage = stage.linked_stage_id 
                      ? stages.find(s => s.id === stage.linked_stage_id)
                      : null
                    const otherPipelineStages = stages.filter(
                      s => s.pipeline_type !== activePipelineTab
                    )
                    
                    return (
                      <div
                        key={stage.id}
                        className="flex flex-col gap-2 rounded-lg border border-border p-3"
                      >
                        <div className="flex items-center gap-3">
                          <span className="flex size-6 items-center justify-center rounded bg-muted text-xs font-medium text-muted-foreground">
                            {index + 1}
                          </span>
                          {editingStageId === stage.id ? (
                            <div className="flex flex-1 flex-col gap-3">
                              <div className="flex gap-2">
                                <Input
                                  value={editingStageName}
                                  onChange={(e) => setEditingStageName(e.target.value)}
                                  placeholder="Stage name"
                                  className="h-8 flex-1"
                                  autoFocus
                                />
                              </div>
                              {activePipelineTab === "sales" && (
                                <div className="flex items-center gap-2">
                                  <Label className="text-xs text-muted-foreground">Probability:</Label>
                                  <Input
                                    type="number"
                                    min={0}
                                    max={100}
                                    value={editingProbability}
                                    onChange={(e) => setEditingProbability(Number(e.target.value))}
                                    className="h-8 w-20"
                                  />
                                  <span className="text-xs text-muted-foreground">%</span>
                                </div>
                              )}
                              <div className="flex items-center gap-2">
                                <Label className="text-xs text-muted-foreground">Link to:</Label>
                                <select
                                  value={editingLinkedStageId || ""}
                                  onChange={(e) => setEditingLinkedStageId(e.target.value || null)}
                                  className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                                >
                                  <option value="">No link</option>
                                  {otherPipelineStages.map(s => (
                                    <option key={s.id} value={s.id}>
                                      {s.pipeline_type === "sales" ? "Sales" : "Production"}: {s.name}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => handleUpdateStage(stage.id)}
                                >
                                  Save
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setEditingStageId(null)
                                    setEditingStageName("")
                                    setEditingProbability(0)
                                    setEditingLinkedStageId(null)
                                  }}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="flex-1">
                                <span className="text-sm font-medium text-foreground">
                                  {stage.name}
                                </span>
                                {activePipelineTab === "sales" && (
                                  <span className="ml-2 text-xs text-muted-foreground">
                                    ({stage.probability}%)
                                  </span>
                                )}
                              </div>
                              {linkedStage && (
                                <span className="flex items-center gap-1 rounded bg-blue-500/10 px-2 py-0.5 text-[10px] font-medium text-blue-600">
                                  <Link2 className="size-3" />
                                  {linkedStage.name}
                                </span>
                              )}
                              {stage.is_default && (
                                <span className="rounded bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                                  Default
                                </span>
                              )}
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => {
                                  setEditingStageId(stage.id)
                                  setEditingStageName(stage.name)
                                  setEditingProbability(stage.probability)
                                  setEditingLinkedStageId(stage.linked_stage_id)
                                }}
                              >
                                <Pencil className="size-3.5 text-muted-foreground" />
                              </Button>
                              {!stage.is_default && (
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  onClick={() => handleDeleteStage(stage.id)}
                                  disabled={deletingStageId === stage.id}
                                >
                                  {deletingStageId === stage.id ? (
                                    <Loader2 className="size-3.5 animate-spin" />
                                  ) : (
                                    <Trash2 className="size-3.5 text-muted-foreground hover:text-destructive" />
                                  )}
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    )
                  })}
                {stages.filter(s => s.pipeline_type === activePipelineTab).length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No stages configured for this pipeline. Add stages from the {activePipelineTab === "sales" ? "Sales" : "Production"} board.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Invite Members */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <UserPlus className="size-4" />
                Invite Team Members
              </CardTitle>
              <CardDescription>
                Invite by email or share a link
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-6">
              {/* Role selector */}
              <div className="flex flex-col gap-2">
                <Label>Invite as</Label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setInviteRole("member")}
                    className={cn(
                      "flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                      inviteRole === "member"
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border text-muted-foreground hover:border-foreground/20",
                    )}
                  >
                    Member
                  </button>
                  <button
                    onClick={() => setInviteRole("admin")}
                    className={cn(
                      "flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                      inviteRole === "admin"
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border text-muted-foreground hover:border-foreground/20",
                    )}
                  >
                    Admin
                  </button>
                </div>
              </div>

              {/* Email invite */}
              <form onSubmit={handleSendInvite} className="flex flex-col gap-3">
                <Label htmlFor="invite-email">
                  <Mail className="mr-1 inline size-3.5" />
                  Invite by email
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="invite-email"
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="teammate@company.com"
                    className="flex-1"
                  />
                  <Button type="submit" disabled={isSendingInvite || !inviteEmail.trim()}>
                    {isSendingInvite ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : inviteSuccess ? (
                      <>
                        <Check className="size-4" />
                        Sent
                      </>
                    ) : (
                      "Send invite"
                    )}
                  </Button>
                </div>
              </form>

              {/* Shareable link */}
              <div className="flex flex-col gap-3">
                <Label>
                  <Link2 className="mr-1 inline size-3.5" />
                  Shareable invite link
                </Label>
                {shareableLink ? (
                  <div className="flex gap-2">
                    <Input value={shareableLink} readOnly className="flex-1 text-xs" />
                    <Button variant="outline" onClick={handleCopyLink}>
                      {linkCopied ? (
                        <>
                          <Check className="size-4" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="size-4" />
                          Copy
                        </>
                      )}
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    onClick={handleGenerateLink}
                    disabled={isGeneratingLink}
                  >
                    {isGeneratingLink ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <>
                        <Link2 className="size-4" />
                        Generate invite link
                      </>
                    )}
                  </Button>
                )}
              </div>

              {/* Pending invites */}
              {pendingInvites.length > 0 && (
                <div className="flex flex-col gap-2">
                  <Label className="text-muted-foreground">Pending invitations</Label>
                  {pendingInvites.map((inv) => (
                    <div
                      key={inv.id}
                      className="flex items-center gap-3 rounded-lg bg-muted p-2.5"
                    >
                      <Mail className="size-3.5 text-muted-foreground" />
                      <span className="flex-1 truncate text-xs text-muted-foreground">
                        {inv.email || "Link invite"}
                      </span>
                      <span className="rounded bg-background px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                        {inv.role}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Log Out */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <LogOut className="size-4" />
                Sign Out
              </CardTitle>
              <CardDescription>
                Sign out of your account on this device.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                onClick={async () => {
                  await signOut()
                  window.location.href = "/auth/login"
                }}
              >
                <LogOut className="size-4" />
                Sign out
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}

interface FeatureToggleProps {
  icon: React.ReactNode
  title: string
  description: string
  enabled: boolean
  onToggle: () => void
  disabled?: boolean
  comingSoon?: boolean
}

function FeatureToggle({ icon, title, description, enabled, onToggle, disabled, comingSoon }: FeatureToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled || comingSoon}
      className={cn(
        "flex items-start gap-3 rounded-lg border p-3 text-left transition-colors",
        enabled 
          ? "border-primary bg-primary/5" 
          : "border-border bg-muted/30 hover:bg-muted/50",
        (disabled || comingSoon) && "opacity-60 cursor-not-allowed"
      )}
    >
      <div className={cn(
        "mt-0.5 flex size-5 items-center justify-center rounded",
        enabled ? "bg-primary text-primary-foreground" : "border border-border bg-background"
      )}>
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
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
    </button>
  )
}
