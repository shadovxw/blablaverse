import React, { useState, useRef } from "react"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { XIcon, CameraIcon, Loader2Icon, UsersIcon, CheckIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import toast from "react-hot-toast"

export default function CreateGroupModal({ contacts, onClose, onCreate }) {
  const [name, setName] = useState("")
  const [avatar, setAvatar] = useState(null)
  const [selected, setSelected] = useState(new Set())
  const [isSaving, setIsSaving] = useState(false)
  const fileInputRef = useRef(null)

  const toggleMember = (id) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleAvatar = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be smaller than 5MB")
      return
    }
    const reader = new FileReader()
    reader.onloadend = () => setAvatar(reader.result)
    reader.readAsDataURL(file)
  }

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error("Group name is required")
      return
    }
    if (selected.size === 0) {
      toast.error("Pick at least one member")
      return
    }
    setIsSaving(true)
    const group = await onCreate({ name: name.trim(), memberIds: [...selected], avatar })
    setIsSaving(false)
    if (group) onClose(group)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-md"
      onClick={() => onClose(null)}
    >
      <div
        className="relative w-full max-w-md rounded-3xl border border-slate-200 dark:border-slate-800 bg-popover p-6 shadow-2xl text-popover-foreground mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => onClose(null)}
          className="absolute right-4 top-4 rounded-xl p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <XIcon className="size-4" />
        </button>

        <div className="mb-5">
          <h2 className="text-xl font-semibold tracking-tight">New Group</h2>
          <p className="text-xs text-slate-400 mt-1">Name your group and pick members.</p>
        </div>

        {/* Avatar + name */}
        <div className="flex items-center gap-3 mb-5">
          <div className="relative group cursor-pointer shrink-0" onClick={() => fileInputRef.current?.click()}>
            <Avatar className="size-14 rounded-full border-2 border-primary/20">
              <AvatarImage src={avatar} alt="Group" className="object-cover size-full" />
              <AvatarFallback className="bg-muted text-muted-foreground">
                <UsersIcon className="size-5" />
              </AvatarFallback>
            </Avatar>
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity">
              <CameraIcon className="size-5 text-white" />
            </div>
          </div>
          <input type="file" ref={fileInputRef} onChange={handleAvatar} accept="image/*" className="hidden" />
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Group name"
            className="flex-1 h-10 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-900/50 px-3.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
          />
        </div>

        {/* Member picker */}
        <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">
          Members ({selected.size})
        </p>
        <div className="max-h-60 overflow-y-auto space-y-1 -mx-1 px-1">
          {contacts.length === 0 && (
            <p className="text-sm text-muted-foreground py-4 text-center">No contacts available</p>
          )}
          {contacts.map((c) => {
            const isOn = selected.has(c._id)
            const initials = c.fullName ? c.fullName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() : "U"
            return (
              <button
                key={c._id}
                type="button"
                onClick={() => toggleMember(c._id)}
                className={cn(
                  "w-full flex items-center gap-3 rounded-lg px-2 py-2 text-left cursor-pointer transition-colors",
                  isOn ? "bg-primary/10" : "hover:bg-slate-100 dark:hover:bg-slate-800"
                )}
              >
                <Avatar className="h-8 w-8 rounded-full border border-border">
                  <AvatarImage src={c.profilePic} alt={c.fullName} />
                  <AvatarFallback className="text-[10px] bg-muted text-muted-foreground">{initials}</AvatarFallback>
                </Avatar>
                <span className="flex-1 text-sm truncate">{c.fullName}</span>
                <span
                  className={cn(
                    "flex items-center justify-center size-5 rounded-full border",
                    isOn ? "bg-primary border-primary text-primary-foreground" : "border-slate-300 dark:border-slate-700"
                  )}
                >
                  {isOn && <CheckIcon className="size-3" />}
                </span>
              </button>
            )
          })}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={() => onClose(null)}
            className="px-4 py-2 text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={isSaving}
            className="flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors cursor-pointer"
          >
            {isSaving && <Loader2Icon className="size-4 animate-spin" />}
            Create Group
          </button>
        </div>
      </div>
    </div>
  )
}
