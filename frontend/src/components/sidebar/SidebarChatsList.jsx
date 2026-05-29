import React from "react"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { useAuthStore } from "@/store/useAuthStore"
import { ImageIcon, PaperclipIcon } from "lucide-react"
import { cn } from "@/lib/utils"

const formatChatTime = (date) => {
  if (!date) return ""
  const d = new Date(date)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  if (isToday) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  const diffDays = Math.floor((now - d) / (1000 * 60 * 60 * 24))
  if (diffDays < 7) return d.toLocaleDateString([], { weekday: "short" })
  return d.toLocaleDateString([], { month: "short", day: "numeric" })
}

export default function SidebarChatsList({ chats, selectedUser, onSelectUser, onlineUsers }) {
  const { authUser } = useAuthStore()

  if (chats.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        No active chats yet
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {chats.map((chat) => {
        const isSelected = selectedUser?._id === chat._id
        const isOnline = onlineUsers.includes(chat._id)
        const unread = chat.unreadCount || 0
        const lm = chat.lastMessage
        const sentByMe = lm && authUser && lm.senderId === authUser._id
        const initials = chat.fullName
          ? chat.fullName
              .split(" ")
              .map((n) => n[0])
              .join("")
              .toUpperCase()
          : "U"

        return (
          <Button
            key={chat._id}
            onClick={() => onSelectUser(chat)}
            variant="ghost"
            className={cn(
              "w-full justify-start gap-3 h-auto py-2.5 px-3 cursor-pointer font-normal",
              isSelected
                ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            )}
          >
            <div className="relative shrink-0">
              <Avatar className="h-9 w-9 rounded-full border border-border">
                <AvatarImage src={chat.profilePic} alt={chat.fullName} />
                <AvatarFallback className="text-[10px] bg-muted text-muted-foreground font-medium">{initials}</AvatarFallback>
              </Avatar>
              <span
                className={cn(
                  "absolute bottom-0 right-0 block h-2 w-2 rounded-full ring-1 ring-background",
                  isOnline ? "bg-green-500 animate-pulse" : "bg-muted-foreground/30"
                )}
              />
            </div>
            <div className="flex-1 min-w-0 text-start">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate font-medium leading-none text-foreground">{chat.fullName}</span>
                {lm && (
                  <span className={cn("text-[10px] shrink-0", unread > 0 ? "text-primary font-medium" : "text-muted-foreground")}>
                    {formatChatTime(lm.createdAt)}
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between gap-2 mt-1">
                <span className="text-[11px] text-muted-foreground truncate block flex items-center gap-1">
                  {lm ? (
                    lm.deleted ? (
                      <span className="italic opacity-70">Message deleted</span>
                    ) : (
                      <>
                        {sentByMe && <span className="opacity-70">You: </span>}
                        {lm.text ? (
                          lm.text
                        ) : lm.image ? (
                          <span className="flex items-center gap-1">
                            <ImageIcon className="size-3" /> Photo
                          </span>
                        ) : lm.file ? (
                          <span className="flex items-center gap-1">
                            <PaperclipIcon className="size-3" /> {lm.file.name || "File"}
                          </span>
                        ) : null}
                      </>
                    )
                  ) : (
                    isOnline ? "Active now" : "Offline"
                  )}
                </span>
                {unread > 0 && (
                  <span className="shrink-0 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold leading-none">
                    {unread > 99 ? "99+" : unread}
                  </span>
                )}
              </div>
            </div>
          </Button>
        )
      })}
    </div>
  )
}
