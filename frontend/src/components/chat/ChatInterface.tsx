import * as React from "react"
import { useChatStore } from "@/store/useChatStore"
import { useAuthStore } from "@/store/useAuthStore"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { ImageIcon, SendIcon, XIcon, MessageSquareIcon } from "lucide-react"
import useKeyboardSound from "@/hooks/useKeyboardSound"
import toast from "react-hot-toast"
import { cn } from "@/lib/utils"

export default function ChatInterface() {
  const { messages, getMessages, isMessagesLoading, selectedUser, sendMessage, isSoundEnabled } = useChatStore()
  const { authUser } = useAuthStore()
  const { playRandomKeyStrokeSound } = useKeyboardSound()

  const [text, setText] = React.useState("")
  const [imagePreview, setImagePreview] = React.useState<string | null>(null)
  
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const messageEndRef = React.useRef<HTMLDivElement>(null)

  // Fetch messages when selected user changes
  React.useEffect(() => {
    if (selectedUser?._id) {
      getMessages(selectedUser._id)
    }
    // Reset state
    setText("")
    setImagePreview(null)
  }, [selectedUser?._id, getMessages])

  // Scroll to bottom on new messages
  React.useEffect(() => {
    if (messageEndRef.current && messages) {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages, isMessagesLoading])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setText(e.target.value)
    if (isSoundEnabled) {
      playRandomKeyStrokeSound()
    }
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file")
      return
    }

    const reader = new FileReader()
    reader.onloadend = () => {
      setImagePreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const removeImage = () => {
    setImagePreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim() && !imagePreview) return

    if (isSoundEnabled) {
      playRandomKeyStrokeSound()
    }

    try {
      await sendMessage({
        text: text.trim(),
        image: imagePreview,
      })
      setText("")
      setImagePreview(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    } catch (error) {
      console.error("Failed to send message:", error)
    }
  }

  if (!selectedUser) return null

  const initials = selectedUser.fullName
    ? selectedUser.fullName
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
    : "U"

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50/20 dark:bg-slate-900/10">
      {/* MESSAGE VIEWPORT */}
      <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-4 min-h-0">
        {isMessagesLoading ? (
          /* Sleek Custom Skeletons */
          <div className="space-y-4 max-w-3xl mx-auto">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className={cn("flex gap-3", i % 2 === 0 ? "justify-end" : "justify-start")}>
                {i % 2 !== 0 && (
                  <div className="h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-800 animate-pulse shrink-0" />
                )}
                <div className="flex flex-col gap-1 max-w-[60%]">
                  <div className="h-10 w-48 rounded-2xl bg-slate-100 dark:bg-slate-800/80 animate-pulse" />
                  <div className="h-3 w-12 rounded bg-slate-100 dark:bg-slate-850 animate-pulse ml-1" />
                </div>
                {i % 2 === 0 && (
                  <div className="h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-800 animate-pulse shrink-0" />
                )}
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          /* Empty Chat Placeholder */
          <div className="flex flex-col items-center justify-center h-full text-center p-8 select-none">
            <div className="flex aspect-square size-12 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 text-slate-400 dark:text-slate-500 shadow-none mb-3">
              <MessageSquareIcon className="size-5" />
            </div>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              No message history
            </h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 max-w-[260px] leading-normal mt-1">
              Say hello to {selectedUser.fullName} to start this conversation!
            </p>
          </div>
        ) : (
          /* Messages List */
          <div className="max-w-3xl mx-auto space-y-4">
            {messages.map((message: any) => {
              const isMyMessage = message.senderId === authUser?._id
              
              return (
                <div
                  key={message._id}
                  className={cn("flex gap-3 items-end", isMyMessage ? "justify-end" : "justify-start")}
                >
                  {/* Left Avatar for partner */}
                  {!isMyMessage && (
                    <Avatar className="h-8 w-8 rounded-full border border-border shrink-0 mb-1">
                      <AvatarImage src={selectedUser.profilePic} alt={selectedUser.fullName} />
                      <AvatarFallback className="text-[10px] bg-muted text-muted-foreground font-semibold">{initials}</AvatarFallback>
                    </Avatar>
                  )}

                  {/* Message details */}
                  <div className={cn("flex flex-col max-w-[70%]", isMyMessage ? "items-end" : "items-start")}>
                    {/* Message content block */}
                    <div
                      className={cn(
                        "rounded-2xl px-4 py-2.5 text-sm shadow-none border border-transparent whitespace-pre-wrap break-words w-fit",
                        isMyMessage
                          ? "bg-primary text-primary-foreground rounded-tr-none border-primary/10"
                          : "bg-muted text-muted-foreground rounded-tl-none border-border"
                      )}
                    >
                      {/* Image render */}
                      {message.image && (
                        <div className="rounded-lg overflow-hidden border border-border max-w-[240px] mb-1.5 bg-slate-100/50 dark:bg-slate-900/50">
                          <img
                            src={message.image}
                            alt="Attachment"
                            className="max-h-[160px] w-full object-cover cursor-pointer hover:scale-[1.02] transition-transform duration-200"
                          />
                        </div>
                      )}

                      {/* Text render */}
                      {message.text && <p className="leading-normal">{message.text}</p>}
                    </div>

                    {/* Timestamp */}
                    <span className="text-[9px] text-muted-foreground/75 px-1 mt-1 leading-none">
                      {new Date(message.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>

                  {/* Right Avatar for authUser */}
                  {isMyMessage && (
                    <Avatar className="h-8 w-8 rounded-full border border-border shrink-0 mb-1">
                      <AvatarImage src={authUser?.profilePic} alt={authUser?.fullName} />
                      <AvatarFallback className="text-[10px] bg-muted text-muted-foreground font-semibold">ME</AvatarFallback>
                    </Avatar>
                  )}
                </div>
              )
            })}
            <div ref={messageEndRef} />
          </div>
        )}
      </div>

      {/* INPUT CONTAINER */}
      <div className="p-4 border-t border-slate-200/50 dark:border-slate-800/50 bg-background/50 backdrop-blur-md">
        {imagePreview && (
          <div className="max-w-3xl mx-auto mb-3 flex items-center">
            <div className="relative">
              <img
                src={imagePreview}
                alt="Preview"
                className="w-20 h-20 object-cover rounded-lg border border-border"
              />
              <Button
                size="icon"
                variant="destructive"
                onClick={removeImage}
                className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 cursor-pointer flex items-center justify-center text-white"
                type="button"
              >
                <XIcon className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}

        <form onSubmit={handleSendMessage} className="max-w-3xl mx-auto flex space-x-2">
          {/* File Input (Hidden) */}
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={handleImageChange}
            className="hidden"
          />

          {/* Select Image Button */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "h-10 w-10 shrink-0 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800",
              imagePreview && "text-primary hover:text-primary/80"
            )}
          >
            <ImageIcon className="h-5 w-5" />
          </Button>

          {/* Input text */}
          <Input
            type="text"
            value={text}
            onChange={handleInputChange}
            placeholder="Type a message..."
            className="flex-1 bg-slate-100/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 focus-visible:ring-1 focus-visible:ring-ring h-10 px-4 rounded-lg"
          />

          {/* Send Button */}
          <Button
            type="submit"
            disabled={!text.trim() && !imagePreview}
            className="h-10 w-10 shrink-0 rounded-lg cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90 flex items-center justify-center p-0"
          >
            <SendIcon className="h-4.5 w-4.5" />
          </Button>
        </form>
      </div>
    </div>
  )
}
