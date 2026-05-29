import React, { useState, useRef } from "react"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import {
  XIcon,
  CameraIcon,
  UsersIcon,
  CheckIcon,
  PencilIcon,
  LogOutIcon,
  ShieldIcon,
  ShieldOffIcon,
  UserMinusIcon,
  UserPlusIcon,
  PlusIcon,
} from "lucide-react"
import { useChatStore } from "@/store/useChatStore"
import { useAuthStore } from "@/store/useAuthStore"
import { cn } from "@/lib/utils"
import toast from "react-hot-toast"

const idOf = (u) => (u && typeof u === "object" ? u._id : u)

export default function GroupInfoModal() {
  const {
    groupInfoOpen,
    setGroupInfoOpen,
    selectedGroup,
    allContacts,
    updateGroup,
    addGroupMembers,
    removeGroupMember,
    setGroupAdmin,
    leaveGroup,
  } = useChatStore()
  const { authUser, onlineUsers } = useAuthStore()

  const [editingName, setEditingName] = useState(false)
  const [name, setName] = useState("")
  const [showAddMembers, setShowAddMembers] = useState(false)
  const avatarInputRef = useRef(null)

  if (!groupInfoOpen || !selectedGroup) return null

  const group = selectedGroup
  const myId = authUser?._id
  const isAdmin = group.admins?.some((a) => idOf(a) === myId)
  const memberIdSet = new Set(group.members?.map(idOf))
  const nonMembers = allContacts.filter((c) => !memberIdSet.has(c._id))

  const close = () => {
    setGroupInfoOpen(false)
    setEditingName(false)
    setShowAddMembers(false)
  }

  const handleAvatar = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be smaller than 5MB")
      return
    }
    const reader = new FileReader()
    reader.onloadend = () => updateGroup(group._id, { avatar: reader.result })
    reader.readAsDataURL(file)
  }

  const saveName = async () => {
    if (name.trim() && name.trim() !== group.name) {
      await updateGroup(group._id, { name: name.trim() })
    }
    setEditingName(false)
  }

  const handleLeave = async () => {
    await leaveGroup(group._id)
    close()
  }

  const initials = group.name
    ? group.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "G"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-md" onClick={close}>
      <div
        className="relative w-full max-w-md rounded-3xl border border-slate-200 dark:border-slate-800 bg-popover p-6 shadow-2xl text-popover-foreground mx-4 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={close} className="absolute right-4 top-4 rounded-xl p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
          <XIcon className="size-4" />
        </button>

        {/* Group header */}
        <div className="flex flex-col items-center gap-3 mb-6">
          <div
            className={cn("relative", isAdmin && "cursor-pointer group")}
            onClick={() => isAdmin && avatarInputRef.current?.click()}
          >
            <Avatar className="size-20 rounded-full border-2 border-primary/20">
              <AvatarImage src={group.avatar} alt={group.name} className="object-cover size-full" />
              <AvatarFallback className="bg-muted text-muted-foreground text-lg">
                {group.avatar ? initials : <UsersIcon className="size-7" />}
              </AvatarFallback>
            </Avatar>
            {isAdmin && (
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity">
                <CameraIcon className="size-5 text-white" />
              </div>
            )}
          </div>
          <input type="file" ref={avatarInputRef} onChange={handleAvatar} accept="image/*" className="hidden" />

          {editingName ? (
            <div className="flex items-center gap-2 w-full max-w-xs">
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="flex-1 h-9 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-900/50 px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
              />
              <button onClick={saveName} className="p-2 rounded-lg bg-primary text-primary-foreground cursor-pointer">
                <CheckIcon className="size-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold tracking-tight">{group.name}</h2>
              {isAdmin && (
                <button
                  onClick={() => {
                    setName(group.name)
                    setEditingName(true)
                  }}
                  className="text-slate-400 hover:text-foreground cursor-pointer"
                >
                  <PencilIcon className="size-3.5" />
                </button>
              )}
            </div>
          )}
          <p className="text-xs text-slate-400">{group.members?.length || 0} members</p>
        </div>

        {/* Add members (admin) */}
        {isAdmin && (
          <div className="mb-4">
            <button
              onClick={() => setShowAddMembers((v) => !v)}
              className="flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 cursor-pointer"
            >
              <UserPlusIcon className="size-4" /> Add members
            </button>
            {showAddMembers && (
              <div className="mt-2 max-h-40 overflow-y-auto space-y-1 rounded-lg border border-border p-1">
                {nonMembers.length === 0 && (
                  <p className="text-xs text-muted-foreground py-3 text-center">Everyone is already in</p>
                )}
                {nonMembers.map((c) => {
                  const ci = c.fullName ? c.fullName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() : "U"
                  return (
                    <div key={c._id} className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800">
                      <Avatar className="h-7 w-7 rounded-full border border-border">
                        <AvatarImage src={c.profilePic} alt={c.fullName} />
                        <AvatarFallback className="text-[10px] bg-muted text-muted-foreground">{ci}</AvatarFallback>
                      </Avatar>
                      <span className="flex-1 text-sm truncate">{c.fullName}</span>
                      <button
                        onClick={() => addGroupMembers(group._id, [c._id])}
                        className="p-1 rounded-md text-primary hover:bg-primary/10 cursor-pointer"
                      >
                        <PlusIcon className="size-4" />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Member list */}
        <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">Members</p>
        <div className="space-y-1">
          {group.members?.map((m) => {
            const mid = idOf(m)
            const isMemberAdmin = group.admins?.some((a) => idOf(a) === mid)
            const isMe = mid === myId
            const isOnline = onlineUsers.includes(mid)
            const mi = m.fullName ? m.fullName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() : "U"
            return (
              <div key={mid} className="flex items-center gap-3 px-1 py-1.5 rounded-lg">
                <div className="relative shrink-0">
                  <Avatar className="h-9 w-9 rounded-full border border-border">
                    <AvatarImage src={m.profilePic} alt={m.fullName} />
                    <AvatarFallback className="text-[10px] bg-muted text-muted-foreground">{mi}</AvatarFallback>
                  </Avatar>
                  {isOnline && (
                    <span className="absolute bottom-0 right-0 block h-2 w-2 rounded-full bg-green-500 ring-1 ring-background" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm truncate block">{m.fullName} {isMe && <span className="text-xs text-muted-foreground">(You)</span>}</span>
                </div>
                {isMemberAdmin && (
                  <span className="text-[10px] font-medium text-primary bg-primary/10 rounded-full px-2 py-0.5">Admin</span>
                )}
                {isAdmin && !isMe && (
                  <div className="flex items-center gap-0.5">
                    <button
                      onClick={() => setGroupAdmin(group._id, mid, !isMemberAdmin)}
                      title={isMemberAdmin ? "Demote" : "Make admin"}
                      className="p-1 rounded-md text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      {isMemberAdmin ? <ShieldOffIcon className="size-4" /> : <ShieldIcon className="size-4" />}
                    </button>
                    <button
                      onClick={() => removeGroupMember(group._id, mid)}
                      title="Remove from group"
                      className="p-1 rounded-md text-muted-foreground hover:text-destructive cursor-pointer"
                    >
                      <UserMinusIcon className="size-4" />
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Leave group */}
        <button
          onClick={handleLeave}
          className="mt-6 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-destructive/30 text-destructive hover:bg-destructive/10 text-sm font-medium cursor-pointer transition-colors"
        >
          <LogOutIcon className="size-4" /> Leave Group
        </button>
      </div>
    </div>
  )
}
