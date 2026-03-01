"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { useAuth } from "@/lib/auth-context"
import { 
  createChat,
  deleteChat, 
  updateChatTitle,
  getUserFolders,
  createFolder,
  updateFolder,
  deleteFolder,
  moveChatToFolder,
  type ChatFolder,
} from "@/lib/actions/chat"
import { signOut } from "@/lib/actions/auth"
import {
  MessageSquarePlus,
  Trash2,
  Settings,
  LogOut,
  Link2,
  Loader2,
  Pencil,
  Check,
  X,
  FolderPlus,
  Folder,
  ChevronRight,
  MoreHorizontal,
  FolderOpen,
} from "lucide-react"
import { cn } from "@/lib/utils"
import Image from "next/image"
import { PROVIDER_LOGOS } from "@/components/provider-logos"
import { NavMenu } from "@/components/navigation/nav-menu"

interface ChatItem {
  id: string
  title: string
  folder_id: string | null
  updated_at: string
}

const FOLDER_COLORS = [
  { name: "Gray", value: "#6b7280" },
  { name: "Red", value: "#ef4444" },
  { name: "Orange", value: "#f97316" },
  { name: "Yellow", value: "#eab308" },
  { name: "Green", value: "#22c55e" },
  { name: "Blue", value: "#3b82f6" },
  { name: "Purple", value: "#a855f7" },
  { name: "Pink", value: "#ec4899" },
]

interface ChatSidebarProps {
  chats: ChatItem[]
  activeChatId?: string
  onChatsChange: () => void
}

export function ChatSidebar({
  chats,
  activeChatId,
  onChatsChange,
}: ChatSidebarProps) {
  const { user, org, isAdmin } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [isCreating, setIsCreating] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState("")
  const editInputRef = useRef<HTMLInputElement>(null)
  
  // Folder state
  const [folders, setFolders] = useState<ChatFolder[]>([])
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const [isCreatingFolder, setIsCreatingFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState("")
  const [newFolderColor, setNewFolderColor] = useState("#6b7280")
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null)
  const [editFolderName, setEditFolderName] = useState("")
  const [editFolderColor, setEditFolderColor] = useState("")
  const folderInputRef = useRef<HTMLInputElement>(null)
  
  // Drag and drop state
  const [draggedChatId, setDraggedChatId] = useState<string | null>(null)
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null)
  const [dragOverUnfoldered, setDragOverUnfoldered] = useState(false)

  const provider = org?.llm_provider
    ? PROVIDER_LOGOS[org.llm_provider as keyof typeof PROVIDER_LOGOS]
    : null

  // Load folders on mount and when chats change
  useEffect(() => {
    async function loadFolders() {
      const data = await getUserFolders()
      setFolders(data)
    }
    loadFolders()
  }, [chats])

  async function handleNewChat() {
    if (!org) return
    setIsCreating(true)
    const result = await createChat(org.id)
    if (result.chat) {
      // Use window.location for hard navigation to ensure redirect works
      window.location.href = `/chat/${result.chat.id}`
    } else {
      setIsCreating(false)
    }
  }

  async function handleDeleteChat(chatId: string, e: React.MouseEvent) {
    e.stopPropagation()
    setDeletingId(chatId)
    await deleteChat(chatId)
    onChatsChange()
    if (activeChatId === chatId) {
      router.push("/chat")
    }
    setDeletingId(null)
  }

  function handleStartEdit(chat: ChatItem, e: React.MouseEvent) {
    e.stopPropagation()
    setEditingId(chat.id)
    setEditTitle(chat.title)
  }

  async function handleSaveEdit(chatId: string) {
    if (editTitle.trim()) {
      await updateChatTitle(chatId, editTitle.trim())
      onChatsChange()
    }
    setEditingId(null)
    setEditTitle("")
  }

  function handleCancelEdit() {
    setEditingId(null)
    setEditTitle("")
  }

  function handleEditKeyDown(e: React.KeyboardEvent, chatId: string) {
    if (e.key === "Enter") {
      e.preventDefault()
      handleSaveEdit(chatId)
    } else if (e.key === "Escape") {
      handleCancelEdit()
    }
  }

  // Focus input when entering edit mode
  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus()
      editInputRef.current.select()
    }
  }, [editingId])

  // Folder handlers
  async function handleCreateFolder() {
    if (!newFolderName.trim()) return
    await createFolder(newFolderName.trim(), newFolderColor)
    setNewFolderName("")
    setNewFolderColor("#6b7280")
    setIsCreatingFolder(false)
    const data = await getUserFolders()
    setFolders(data)
  }

  async function handleUpdateFolder(folderId: string) {
    if (!editFolderName.trim()) return
    await updateFolder(folderId, editFolderName.trim(), editFolderColor)
    setEditingFolderId(null)
    const data = await getUserFolders()
    setFolders(data)
  }

  async function handleDeleteFolder(folderId: string) {
    await deleteFolder(folderId)
    const data = await getUserFolders()
    setFolders(data)
    onChatsChange()
  }

  async function handleMoveToFolder(chatId: string, folderId: string | null) {
    await moveChatToFolder(chatId, folderId)
    onChatsChange()
  }

  // Drag and drop handlers
  function handleDragStart(e: React.DragEvent, chatId: string) {
    setDraggedChatId(chatId)
    e.dataTransfer.effectAllowed = "move"
    e.dataTransfer.setData("text/plain", chatId)
  }

  function handleDragEnd() {
    setDraggedChatId(null)
    setDragOverFolderId(null)
    setDragOverUnfoldered(false)
  }

  function handleDragOverFolder(e: React.DragEvent, folderId: string) {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
    setDragOverFolderId(folderId)
    setDragOverUnfoldered(false)
  }

  function handleDragOverUnfoldered(e: React.DragEvent) {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
    setDragOverFolderId(null)
    setDragOverUnfoldered(true)
  }

  function handleDragLeave() {
    setDragOverFolderId(null)
    setDragOverUnfoldered(false)
  }

  async function handleDropOnFolder(e: React.DragEvent, folderId: string) {
    e.preventDefault()
    const chatId = e.dataTransfer.getData("text/plain")
    if (chatId) {
      await handleMoveToFolder(chatId, folderId)
      // Auto-expand the folder when dropping into it
      setExpandedFolders((prev) => new Set([...prev, folderId]))
    }
    handleDragEnd()
  }

  async function handleDropOnUnfoldered(e: React.DragEvent) {
    e.preventDefault()
    const chatId = e.dataTransfer.getData("text/plain")
    if (chatId) {
      await handleMoveToFolder(chatId, null)
    }
    handleDragEnd()
  }

  function toggleFolder(folderId: string) {
    setExpandedFolders((prev) => {
      const next = new Set(prev)
      if (next.has(folderId)) {
        next.delete(folderId)
      } else {
        next.add(folderId)
      }
      return next
    })
  }

  // Group chats by folder
  const chatsByFolder = new Map<string | null, ChatItem[]>()
  chatsByFolder.set(null, [])
  if (Array.isArray(folders)) {
    folders.forEach((f) => chatsByFolder.set(f.id, []))
  }
  const safeChats = Array.isArray(chats) ? chats : []
  safeChats.forEach((chat) => {
    const key = chat.folder_id || null
    if (!chatsByFolder.has(key)) {
      chatsByFolder.set(null, [...(chatsByFolder.get(null) || []), chat])
    } else {
      chatsByFolder.get(key)?.push(chat)
    }
  })
  const unfolderedChats = chatsByFolder.get(null) || []

  return (
    <aside className="flex h-full w-full flex-col border-r border-border bg-card">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border px-3 py-3">
        <NavMenu />
        <div className="flex items-center gap-2">
          <Image
            src="/images/hover-ninja-logo.png"
            alt="Hover Ninja logo"
            width={28}
            height={28}
            className="size-7"
          />
          <span className="text-sm font-semibold text-foreground">
            Hover Ninja
            <sup className="ml-0.5 text-[10px] font-medium text-muted-foreground">ALPHA</sup>
          </span>
        </div>
      </div>

      {/* New chat button */}
      <div className="p-3">
        <Button
          onClick={handleNewChat}
          variant="outline"
          className="w-full justify-start"
          disabled={isCreating}
        >
          {isCreating ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <MessageSquarePlus className="size-4" />
          )}
          New chat
        </Button>
      </div>

      {/* Chat list with folders */}
      <nav className="flex-1 overflow-y-auto px-3 pb-3">
        <div className="flex flex-col gap-1">
          {/* Folders section */}
          {folders.length > 0 && (
            <div className="mb-2">
              {Array.isArray(folders) && folders.map((folder) => {
                const folderChats = chatsByFolder.get(folder.id) || []
                const isExpanded = expandedFolders.has(folder.id)
                
                return (
                  <div key={folder.id} className="mb-1">
                    {editingFolderId === folder.id ? (
                      <div className="flex items-center gap-1 rounded-lg bg-muted px-2 py-1.5">
                        <Input
                          value={editFolderName}
                          onChange={(e) => setEditFolderName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleUpdateFolder(folder.id)
                            if (e.key === "Escape") setEditingFolderId(null)
                          }}
                          className="h-6 flex-1 text-sm"
                          autoFocus
                        />
                        <Popover>
                          <PopoverTrigger asChild>
                            <button
                              className="size-5 shrink-0 rounded"
                              style={{ backgroundColor: editFolderColor }}
                            />
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-2">
                            <div className="grid grid-cols-4 gap-1">
                              {FOLDER_COLORS.map((c) => (
                                <button
                                  key={c.value}
                                  className={cn(
                                    "size-6 rounded",
                                    editFolderColor === c.value && "ring-2 ring-primary ring-offset-1"
                                  )}
                                  style={{ backgroundColor: c.value }}
                                  onClick={() => setEditFolderColor(c.value)}
                                />
                              ))}
                            </div>
                          </PopoverContent>
                        </Popover>
                        <button onClick={() => handleUpdateFolder(folder.id)} className="p-0.5 hover:text-primary">
                          <Check className="size-3.5" />
                        </button>
                        <button onClick={() => setEditingFolderId(null)} className="p-0.5 hover:text-muted-foreground">
                          <X className="size-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div 
                        className={cn(
                          "group flex items-center rounded-lg px-2 py-1.5 hover:bg-accent transition-colors",
                          dragOverFolderId === folder.id && "bg-accent ring-2 ring-primary ring-inset"
                        )}
                        onDragOver={(e) => handleDragOverFolder(e, folder.id)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDropOnFolder(e, folder.id)}
                      >
                        <button
                          onClick={() => toggleFolder(folder.id)}
                          className="flex flex-1 items-center gap-2 text-left"
                        >
                          <ChevronRight
                            className={cn(
                              "size-3.5 text-muted-foreground transition-transform",
                              isExpanded && "rotate-90"
                            )}
                          />
                          {isExpanded ? (
                            <FolderOpen className="size-4" style={{ color: folder.color }} />
                          ) : (
                            <Folder className="size-4" style={{ color: folder.color }} />
                          )}
                          <span className="flex-1 truncate text-sm">{folder.name}</span>
                          <span className="text-xs text-muted-foreground">{folderChats.length}</span>
                        </button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="ml-1 rounded p-1 opacity-0 hover:bg-muted group-hover:opacity-100">
                              <MoreHorizontal className="size-3.5" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-32">
                            <DropdownMenuItem onClick={() => {
                              setEditingFolderId(folder.id)
                              setEditFolderName(folder.name)
                              setEditFolderColor(folder.color)
                            }}>
                              <Pencil className="mr-2 size-3.5" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleDeleteFolder(folder.id)}
                            >
                              <Trash2 className="mr-2 size-3.5" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    )}
                    
                    {/* Folder chats */}
                    {isExpanded && (
                      <div className="ml-4 mt-0.5 flex flex-col gap-0.5 border-l border-border pl-2">
                        {folderChats.map((chat) => (
                          <ChatListItem
                            key={chat.id}
                            chat={chat}
                            isActive={activeChatId === chat.id}
                            isEditing={editingId === chat.id}
                            editTitle={editTitle}
                            editInputRef={editInputRef}
                            isDeleting={deletingId === chat.id}
                            isDragging={draggedChatId === chat.id}
                            folders={folders}
                            onNavigate={() => router.push(`/chat/${chat.id}`)}
                            onStartEdit={(e) => handleStartEdit(chat, e)}
                            onSaveEdit={() => handleSaveEdit(chat.id)}
                            onCancelEdit={handleCancelEdit}
                            onEditKeyDown={(e) => handleEditKeyDown(e, chat.id)}
                            onEditTitleChange={setEditTitle}
                            onDelete={(e) => handleDeleteChat(chat.id, e)}
                            onMoveToFolder={(folderId) => handleMoveToFolder(chat.id, folderId)}
                            onDragStart={(e) => handleDragStart(e, chat.id)}
                            onDragEnd={handleDragEnd}
                          />
                        ))}
                        {folderChats.length === 0 && (
                          <p className="px-2 py-2 text-xs text-muted-foreground">Empty folder</p>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Create folder button */}
          {isCreatingFolder ? (
            <div className="mb-2 flex items-center gap-1 rounded-lg bg-muted px-2 py-1.5">
              <FolderPlus className="size-4 text-muted-foreground" />
              <Input
                ref={folderInputRef}
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    handleCreateFolder()
                  }
                  if (e.key === "Escape") setIsCreatingFolder(false)
                }}
                placeholder="Folder name"
                className="h-6 flex-1 text-sm"
                autoFocus
              />
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    className="size-5 shrink-0 rounded"
                    style={{ backgroundColor: newFolderColor }}
                  />
                </PopoverTrigger>
                <PopoverContent className="w-auto p-2">
                  <div className="grid grid-cols-4 gap-1">
                    {FOLDER_COLORS.map((c) => (
                      <button
                        key={c.value}
                        className={cn(
                          "size-6 rounded",
                          newFolderColor === c.value && "ring-2 ring-primary ring-offset-1"
                        )}
                        style={{ backgroundColor: c.value }}
                        onClick={() => setNewFolderColor(c.value)}
                      />
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
              <button onClick={handleCreateFolder} className="p-0.5 hover:text-primary">
                <Check className="size-3.5" />
              </button>
              <button onClick={() => setIsCreatingFolder(false)} className="p-0.5 hover:text-muted-foreground">
                <X className="size-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsCreatingFolder(true)}
              className="mb-2 flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <FolderPlus className="size-4" />
              New folder
            </button>
          )}

          {/* Unfoldered chats - drop zone to remove from folder */}
          <div
            className={cn(
              "flex flex-col gap-0.5 rounded-lg transition-colors",
              dragOverUnfoldered && draggedChatId && chats.find(c => c.id === draggedChatId)?.folder_id && "bg-accent ring-2 ring-primary ring-inset"
            )}
            onDragOver={(e) => {
              // Only show drop zone if dragging a chat that's in a folder
              const chat = chats.find(c => c.id === draggedChatId)
              if (chat?.folder_id) {
                handleDragOverUnfoldered(e)
              }
            }}
            onDragLeave={handleDragLeave}
            onDrop={handleDropOnUnfoldered}
          >
            {unfolderedChats.map((chat) => (
              <ChatListItem
                key={chat.id}
                chat={chat}
                isActive={activeChatId === chat.id}
                isEditing={editingId === chat.id}
                editTitle={editTitle}
                editInputRef={editInputRef}
                isDeleting={deletingId === chat.id}
                isDragging={draggedChatId === chat.id}
                folders={folders}
                onNavigate={() => router.push(`/chat/${chat.id}`)}
                onStartEdit={(e) => handleStartEdit(chat, e)}
                onSaveEdit={() => handleSaveEdit(chat.id)}
                onCancelEdit={handleCancelEdit}
                onEditKeyDown={(e) => handleEditKeyDown(e, chat.id)}
                onEditTitleChange={setEditTitle}
                onDelete={(e) => handleDeleteChat(chat.id, e)}
                onMoveToFolder={(folderId) => handleMoveToFolder(chat.id, folderId)}
                onDragStart={(e) => handleDragStart(e, chat.id)}
                onDragEnd={handleDragEnd}
              />
            ))}
          </div>

          {chats.length === 0 && (
            <p className="px-3 py-6 text-center text-xs text-muted-foreground">
              No chats yet. Start a new conversation.
            </p>
          )}
        </div>
      </nav>

      {/* Footer with status + actions */}
      <div className="border-t border-border p-3">
        <div className="mb-2 flex flex-wrap items-center gap-1.5">
          {provider && (
            <div className="flex items-center gap-1 rounded bg-muted px-2 py-1">
              <provider.logo className="size-3 text-muted-foreground" />
              <span className="text-[10px] font-medium text-muted-foreground">
                {provider.name}
              </span>
            </div>
          )}
          {org?.hover_access_token && (
            <div className="flex items-center gap-1 rounded bg-muted px-2 py-1">
              <Link2 className="size-3 text-muted-foreground" />
              <span className="text-[10px] font-medium text-muted-foreground">
                Hover
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1">
          {isAdmin && (
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 justify-start text-xs"
              onClick={() => router.push("/settings")}
            >
              <Settings className="size-3.5" />
              Settings
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground"
            onClick={async () => {
              await signOut()
              window.location.href = "/auth/login"
            }}
          >
            <LogOut className="size-3.5" />
          </Button>
        </div>
        <p className="mt-1 truncate px-1 text-[10px] text-muted-foreground">
          {user?.email}
        </p>
      </div>
    </aside>
  )
}

// Extracted chat list item component
function ChatListItem({
  chat,
  isActive,
  isEditing,
  editTitle,
  editInputRef,
  isDeleting,
  isDragging,
  folders,
  onNavigate,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onEditKeyDown,
  onEditTitleChange,
  onDelete,
  onMoveToFolder,
  onDragStart,
  onDragEnd,
}: {
  chat: ChatItem
  isActive: boolean
  isEditing: boolean
  editTitle: string
  editInputRef: React.RefObject<HTMLInputElement | null>
  isDeleting: boolean
  isDragging: boolean
  folders: ChatFolder[]
  onNavigate: () => void
  onStartEdit: (e: React.MouseEvent) => void
  onSaveEdit: () => void
  onCancelEdit: () => void
  onEditKeyDown: (e: React.KeyboardEvent) => void
  onEditTitleChange: (value: string) => void
  onDelete: (e: React.MouseEvent) => void
  onMoveToFolder: (folderId: string | null) => void
  onDragStart: (e: React.DragEvent) => void
  onDragEnd: () => void
}) {
  function formatDate(dateStr: string) {
    const date = new Date(dateStr)
    const now = new Date()
    
    // Compare by calendar dates, not milliseconds
    // Reset both to start of day in local timezone for accurate comparison
    const dateDay = new Date(date.getFullYear(), date.getMonth(), date.getDate())
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const diffMs = today.getTime() - dateDay.getTime()
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return "Today"
    if (diffDays === 1) return "Yesterday"
    if (diffDays < 7) return `${diffDays} days ago`
    return date.toLocaleDateString()
  }

  return (
    <div
      draggable={!isEditing}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={cn(
        "group flex items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-accent cursor-grab active:cursor-grabbing",
        isActive ? "bg-accent text-foreground" : "text-muted-foreground",
        isDragging && "opacity-50"
      )}
    >
      {isEditing ? (
        <div className="flex min-w-0 flex-1 items-center gap-1">
          <Input
            ref={editInputRef}
            value={editTitle}
            onChange={(e) => onEditTitleChange(e.target.value)}
            onKeyDown={onEditKeyDown}
            onBlur={onSaveEdit}
            className="h-7 text-sm"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={(e) => {
              e.stopPropagation()
              onSaveEdit()
            }}
            className="shrink-0 rounded p-1 hover:bg-primary/10 hover:text-primary"
            aria-label="Save"
          >
            <Check className="size-3.5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onCancelEdit()
            }}
            className="shrink-0 rounded p-1 hover:bg-muted"
            aria-label="Cancel"
          >
            <X className="size-3.5" />
          </button>
        </div>
      ) : (
        <>
          <button onClick={onNavigate} className="min-w-0 flex-1 text-left">
            <p className="truncate text-sm">{chat.title}</p>
            <p className="text-xs text-muted-foreground/60">{formatDate(chat.updated_at)}</p>
          </button>
          <div className="ml-1 flex shrink-0 items-center gap-0.5 opacity-100 md:opacity-0 md:group-hover:opacity-100">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="rounded p-1 transition-colors hover:bg-muted" aria-label="More options">
                  <MoreHorizontal className="size-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem onClick={onStartEdit}>
                  <Pencil className="mr-2 size-3.5" />
                  Rename
                </DropdownMenuItem>
                {folders.length > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem disabled className="text-xs text-muted-foreground">
                      Move to folder
                    </DropdownMenuItem>
                    {chat.folder_id && (
                      <DropdownMenuItem onClick={() => onMoveToFolder(null)}>
                        <X className="mr-2 size-3.5" />
                        Remove from folder
                      </DropdownMenuItem>
                    )}
                    {Array.isArray(folders) && folders.map((folder) => (
                      <DropdownMenuItem
                        key={folder.id}
                        onClick={() => onMoveToFolder(folder.id)}
                        disabled={chat.folder_id === folder.id}
                      >
                        <Folder className="mr-2 size-3.5" style={{ color: folder.color }} />
                        {folder.name}
                      </DropdownMenuItem>
                    ))}
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive" onClick={onDelete}>
                  {isDeleting ? (
                    <Loader2 className="mr-2 size-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="mr-2 size-3.5" />
                  )}
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </>
      )}
    </div>
  )
}
