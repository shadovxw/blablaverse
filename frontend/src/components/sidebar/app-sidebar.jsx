"use client"

import * as React from "react"
import { useNavigate, useLocation } from "react-router"
import { NavUser } from "@/components/sidebar/nav-user"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInput,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { MessageSquareIcon, UsersIcon, FolderIcon, ArchiveIcon, TerminalIcon, SearchIcon } from "lucide-react"
import { useChatStore } from "@/store/useChatStore"
import { useAuthStore } from "@/store/useAuthStore"
import SidebarChatsList from "./SidebarChatsList"
import SidebarContactList from "./SidebarContactList"
import UsersLoadingSkeleton from "@/components/UsersLoadingSkeleton"

const data = {
  navMain: [
    {
      title: "Chats",
      url: "#",
      icon: <MessageSquareIcon />,
      isActive: true,
    },
    {
      title: "Contacts",
      url: "#",
      icon: <UsersIcon />,
      isActive: false,
    },
    {
      title: "Groups",
      url: "#",
      icon: <FolderIcon />,
      isActive: false,
    },
    {
      title: "Archived",
      url: "#",
      icon: <ArchiveIcon />,
      isActive: false,
    },
  ],
}

export function AppSidebar({ ...props }) {
  const [activeItem, setActiveItem] = React.useState(data.navMain[0])
  const [searchQuery, setSearchQuery] = React.useState("")
  const [showUnreadOnly, setShowUnreadOnly] = React.useState(false)
  
  const {
    chats,
    allContacts,
    isUsersLoading,
    selectedUser,
    setSelectedUser,
    getMyChatPartners,
    getAllContacts,
  } = useChatStore()

  const { authUser, onlineUsers } = useAuthStore()
  const { setOpen } = useSidebar()
  const navigate = useNavigate()
  const location = useLocation()

  // Fetch initial data
  React.useEffect(() => {
    getMyChatPartners()
    getAllContacts()
  }, [getMyChatPartners, getAllContacts])

  // Handle clicking a user from the lists
  const handleSelectUser = (user) => {
    setSelectedUser(user)
    // Redirection: if they are not on the main chat page, navigate there
    if (location.pathname !== "/") {
      navigate("/")
    }
  }

  // Filter lists based on search
  const filteredChats = chats.filter((chat) => {
    const matchesSearch = chat.fullName.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesUnread = !showUnreadOnly || (chat.unreadCount || 0) > 0
    return matchesSearch && matchesUnread
  })

  const filteredContacts = allContacts.filter((contact) =>
    contact.fullName.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const user = authUser
    ? {
        name: authUser.fullName,
        email: authUser.email || "",
        avatar: authUser.profilePic || "/avatar.png",
      }
    : null

  return (
    <Sidebar
      collapsible="icon"
      className="overflow-hidden *:data-[sidebar=sidebar]:flex-row border-slate-200 dark:border-slate-800"
      {...props}
    >
      {/* 1st Sidebar (Left Column - Icon Navigation) */}
      <Sidebar
        collapsible="none"
        style={{ width: "calc(var(--sidebar-width-icon) + 1px)" }}
        className="!w-[calc(var(--sidebar-width-icon)+1px)] border-e border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex flex-col justify-between"
      >
        <div>
          <SidebarHeader className="flex h-14 items-center justify-center py-0 border-b border-slate-200/50 dark:border-slate-800/50">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton size="lg" asChild className="md:h-8 md:p-0 flex items-center justify-center">
                  <a href="#">
                    <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-md shadow-primary/20">
                      <TerminalIcon className="size-4" />
                    </div>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarHeader>

          <SidebarContent className="py-4">
            <SidebarGroup className="p-0">
              <SidebarGroupContent className="px-1.5 md:px-0">
                <SidebarMenu className="gap-2 flex flex-col items-center">
                  {data.navMain.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        tooltip={{
                          children: item.title,
                          hidden: false,
                        }}
                        onClick={() => {
                          setActiveItem(item)
                          setSearchQuery("")
                          setOpen(true)
                        }}
                        isActive={activeItem?.title === item.title}
                        className="px-2.5 md:px-2 cursor-pointer"
                      >
                        {item.icon}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </div>

        {user && (
          <SidebarFooter className="p-2 border-t border-slate-100 dark:border-slate-900 bg-slate-50 dark:bg-slate-950">
            <NavUser user={user} />
          </SidebarFooter>
        )}
      </Sidebar>

      {/* 2nd Sidebar (Right Column - Lists details) */}
      <Sidebar collapsible="none" className="hidden flex-1 md:flex bg-slate-50/30 dark:bg-slate-900/10">
        <SidebarHeader className="h-14 flex flex-row items-center justify-between border-b border-slate-200/50 dark:border-slate-800/50 px-4 py-0 gap-0">
          <div className="text-base font-bold text-slate-800 dark:text-slate-200">
            {activeItem?.title}
          </div>
          {activeItem?.title === "Chats" && (
            <Label className="flex items-center gap-2 text-xs font-normal text-slate-500 dark:text-slate-400 cursor-pointer">
              <span>Unreads</span>
              <Switch checked={showUnreadOnly} onCheckedChange={setShowUnreadOnly} className="shadow-none" />
            </Label>
          )}
        </SidebarHeader>
        <div className="p-3 bg-transparent flex items-center shrink-0">
          <div className="relative w-full">
            <SidebarInput
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 bg-slate-100/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 focus-visible:ring-1 focus-visible:ring-ring"
            />
            <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
          </div>
        </div>

        <SidebarContent className="p-2">
          <SidebarGroup className="p-0">
            <SidebarGroupContent>
              {isUsersLoading ? (
                <div className="px-2 py-3">
                  <UsersLoadingSkeleton />
                </div>
              ) : activeItem.title === "Chats" ? (
                <SidebarChatsList
                  chats={filteredChats}
                  selectedUser={selectedUser}
                  onSelectUser={handleSelectUser}
                  onlineUsers={onlineUsers}
                />
              ) : activeItem.title === "Contacts" ? (
                <SidebarContactList
                  contacts={filteredContacts}
                  selectedUser={selectedUser}
                  onSelectUser={handleSelectUser}
                  onlineUsers={onlineUsers}
                />
              ) : activeItem.title === "Groups" ? (
                <div className="text-center py-8 text-slate-400 dark:text-slate-500 text-sm">
                  Groups feature coming soon!
                </div>
              ) : (
                <div className="text-center py-8 text-slate-400 dark:text-slate-500 text-sm">
                  Archived chats coming soon!
                </div>
              )}
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
    </Sidebar>
  )
}
