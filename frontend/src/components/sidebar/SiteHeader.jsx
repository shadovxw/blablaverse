import React from "react"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { useChatStore } from "@/store/useChatStore"
import { useAuthStore } from "@/store/useAuthStore"
import { MoreVerticalIcon, SearchIcon } from "lucide-react"

const formatLastSeen = (date) => {
  if (!date) return "Offline"
  const d = new Date(date)
  const now = new Date()
  const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  const isToday = d.toDateString() === now.toDateString()
  const yesterday = new Date()
  yesterday.setDate(now.getDate() - 1)
  const isYesterday = d.toDateString() === yesterday.toDateString()
  if (isToday) return `last seen today at ${time}`
  if (isYesterday) return `last seen yesterday at ${time}`
  return `last seen ${d.toLocaleDateString([], { month: "short", day: "numeric" })}`
}

export default function SiteHeader() {
  const { selectedUser, isTyping, messageSearchOpen, toggleMessageSearch } = useChatStore()
  const { onlineUsers } = useAuthStore()

  const isOnline = selectedUser && onlineUsers.includes(selectedUser._id)

  // Status priority: typing > online > last seen > offline
  let statusText = "Offline"
  if (isTyping) statusText = "typing…"
  else if (isOnline) statusText = "Active now"
  else if (selectedUser?.lastSeen) statusText = formatLastSeen(selectedUser.lastSeen)

  return (
    <header className="flex h-14 shrink-0 items-center justify-between px-4 border-b border-slate-200/50 dark:border-slate-800/50 bg-background/50 backdrop-blur-md">
      {/* Left side: Sidebar trigger & Chat Partner Info */}
      <div className="flex items-center gap-3">
        <SidebarTrigger className="h-8 w-8 rounded-lg border border-slate-200 dark:border-slate-800 bg-background hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer shadow-none flex items-center justify-center p-0 text-slate-700 dark:text-slate-300" />

        {selectedUser ? (
          <div className="flex items-center gap-2.5 ml-1">
            <div className="relative">
              <div className="h-8 w-8 rounded-full overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800">
                <img
                  src={selectedUser.profilePic || "/avatar.png"}
                  alt={selectedUser.fullName}
                  className="h-full w-full object-cover"
                />
              </div>
              <span
                className={`absolute bottom-0 right-0 block h-2 w-2 rounded-full ring-1 ring-slate-100 dark:ring-slate-950 ${
                  isOnline ? "bg-green-500 animate-pulse" : "bg-slate-400"
                }`}
              />
            </div>
            <div className="flex flex-col text-start">
              <span className="text-sm font-medium text-slate-900 dark:text-slate-100 leading-none">
                {selectedUser.fullName}
              </span>
              <span
                className={`text-[10px] mt-1 leading-none ${
                  isTyping
                    ? "text-primary font-medium"
                    : "text-slate-500 dark:text-slate-400"
                }`}
              >
                {statusText}
              </span>
            </div>
          </div>
        ) : (
          <div className="ml-1 flex items-center h-8">
            <span className="text-sm font-medium text-slate-400 dark:text-slate-500">
              No active chat
            </span>
          </div>
        )}
      </div>

      {/* Right side: search + three-dot menu */}
      <div className="flex items-center gap-1">
        {selectedUser && (
          <button
            onClick={toggleMessageSearch}
            title="Search messages"
            className={`h-8 w-8 rounded-lg flex items-center justify-center cursor-pointer transition-colors ${
              messageSearchOpen
                ? "bg-slate-100 dark:bg-slate-800 text-primary"
                : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            <SearchIcon className="size-[18px]" />
          </button>
        )}
        <button className="h-8 w-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer transition-colors">
          <MoreVerticalIcon className="size-5" />
        </button>
      </div>
    </header>
  )
}
