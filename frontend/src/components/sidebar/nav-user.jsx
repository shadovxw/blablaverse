import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { 
  ChevronsUpDownIcon, 
  SparklesIcon, 
  BellIcon, 
  LogOutIcon, 
  MoonIcon, 
  SunIcon, 
  UserIcon, 
  XIcon, 
  CameraIcon, 
  Loader2Icon 
} from "lucide-react"
import { useState, useRef, useEffect } from "react"
import { useAuthStore } from "@/store/useAuthStore"
import { useThemeStore } from "@/store/useThemeStore"
import { useChatStore } from "@/store/useChatStore"
import { Switch } from "@/components/ui/switch"
import toast from "react-hot-toast"

export function NavUser({
  user
}) {
  const { isMobile } = useSidebar()
  const { logout, updateProfile } = useAuthStore()
  const { theme, toggleTheme } = useThemeStore()
  const { isSoundEnabled, toggleSound } = useChatStore()

  // Profile modal states
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)
  const [fullName, setFullName] = useState(user?.name || "")
  const [selectedImg, setSelectedImg] = useState(null)
  const [isSaving, setIsSaving] = useState(false)
  const fileInputRef = useRef(null)

  // Keep fullName in sync with user prop when it updates or modal opens
  useEffect(() => {
    if (user?.name) {
      setFullName(user.name)
    }
  }, [user?.name, isProfileModalOpen])

  const handleImageUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be less than 5MB")
      return
    }

    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onloadend = () => {
      setSelectedImg(reader.result)
    }
  }

  const handleSaveProfile = async () => {
    if (!fullName.trim()) {
      toast.error("Full name cannot be empty")
      return
    }

    const updateData = {}
    if (fullName !== user.name) {
      updateData.fullName = fullName
    }
    if (selectedImg) {
      updateData.profilePic = selectedImg
    }

    if (Object.keys(updateData).length === 0) {
      setIsProfileModalOpen(false)
      return
    }

    setIsSaving(true)
    try {
      await updateProfile(updateData)
      setIsProfileModalOpen(false)
      setSelectedImg(null)
    } catch (error) {
      console.error(error)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground md:h-8 md:p-0">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback className="rounded-lg">
                    {user.name ? user.name.substring(0, 2).toUpperCase() : "US"}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-start text-sm leading-tight">
                  <span className="truncate font-medium">{user.name}</span>
                  <span className="truncate text-xs">{user.email}</span>
                </div>
                <ChevronsUpDownIcon className="ms-auto size-4" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
              side={isMobile ? "bottom" : "right"}
              align="end"
              sideOffset={4}>
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-start text-sm">
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarImage src={user.avatar} alt={user.name} />
                    <AvatarFallback className="rounded-lg">
                      {user.name ? user.name.substring(0, 2).toUpperCase() : "US"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-start text-sm leading-tight">
                    <span className="truncate font-medium">{user.name}</span>
                    <span className="truncate text-xs">{user.email}</span>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem onClick={() => window.open("https://github.com/shadovxw", "_blank")} className="cursor-pointer">
                  <SparklesIcon />
                  Go to shadovxw page
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem onClick={() => setIsProfileModalOpen(true)} className="cursor-pointer">
                  <UserIcon />
                  Update Profile
                </DropdownMenuItem>
                
                <DropdownMenuItem onClick={toggleTheme} className="justify-between cursor-pointer">
                  <div className="flex items-center gap-2">
                    {theme === "dark" ? <MoonIcon /> : <SunIcon />}
                    <span>Dark Mode</span>
                  </div>
                  <Switch checked={theme === "dark"} className="pointer-events-none" />
                </DropdownMenuItem>
                
                <DropdownMenuItem onClick={toggleSound} className="justify-between cursor-pointer">
                  <div className="flex items-center gap-2">
                    <BellIcon />
                    <span>Notifications</span>
                  </div>
                  <Switch checked={isSoundEnabled} className="pointer-events-none" />
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout} className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10">
                <LogOutIcon />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>

      {/* UPDATE PROFILE MODAL OVERLAY */}
      {isProfileModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-md transition-all duration-300"
          onClick={() => setIsProfileModalOpen(false)}
        >
          <div 
            className="relative w-full max-w-md rounded-3xl border border-slate-200 dark:border-slate-800 bg-popover p-6 shadow-2xl text-popover-foreground scale-in animate-in zoom-in-95 duration-200 mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button 
              onClick={() => setIsProfileModalOpen(false)}
              className="absolute right-4 top-4 rounded-xl p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <XIcon className="size-4" />
            </button>

            {/* Header */}
            <div className="mb-6">
              <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">Update Profile</h2>
              <p className="text-xs text-slate-400 mt-1">Manage your account information and public photo.</p>
            </div>

            {/* Form Content */}
            <div className="space-y-6">
              {/* Avatar Upload section */}
              <div className="flex flex-col items-center justify-center gap-2.5">
                <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                  <Avatar className="size-24 rounded-full border-2 border-primary/20 group-hover:border-primary/50 transition-colors duration-200">
                    <AvatarImage 
                      src={selectedImg || user.avatar} 
                      alt={user.name} 
                      className="object-cover size-full" 
                    />
                    <AvatarFallback className="text-xl font-bold">
                      {user.name ? user.name.substring(0, 2).toUpperCase() : "US"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute inset-0 flex items-center justify-center rounded-full bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <CameraIcon className="size-6 text-white" />
                  </div>
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleImageUpload} 
                  accept="image/*" 
                  className="hidden" 
                />
                <span className="text-xs text-slate-400">Click to upload photo</span>
              </div>

              {/* Input fields */}
              <div className="space-y-4">
                <div className="space-y-1.5 text-start">
                  <label htmlFor="fullName" className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                    Full Name
                  </label>
                  <input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Your full name"
                    className="w-full h-10 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-900/50 px-3.5 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary transition-all"
                  />
                </div>

                <div className="space-y-1.5 text-start">
                  <label htmlFor="email" className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                    Email Address
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={user.email}
                    disabled
                    className="w-full h-10 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100/30 dark:bg-slate-900/30 px-3.5 py-2 text-sm text-slate-400 cursor-not-allowed"
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setIsProfileModalOpen(false)}
                className="px-4 py-2 text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveProfile}
                disabled={isSaving}
                className="flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors shadow-md shadow-primary/10 cursor-pointer"
              >
                {isSaving && <Loader2Icon className="size-4 animate-spin" />}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
