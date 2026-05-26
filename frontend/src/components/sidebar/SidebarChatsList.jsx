import React from "react"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export default function SidebarChatsList({ chats, selectedUser, onSelectUser, onlineUsers }) {
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
              <Avatar className="h-8 w-8 rounded-full border border-border">
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
              <span className="truncate block font-medium leading-none mb-1 text-foreground">{chat.fullName}</span>
              <span className="text-[10px] text-muted-foreground truncate block">
                {isOnline ? "Active now" : "Offline"}
              </span>
            </div>
          </Button>
        )
      })}
    </div>
  )
}
