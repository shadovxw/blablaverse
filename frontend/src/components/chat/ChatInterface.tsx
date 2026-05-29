import * as React from "react"
import { useChatStore } from "@/store/useChatStore"
import { useAuthStore } from "@/store/useAuthStore"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { ImageIcon, SendIcon, XIcon, MessageSquareIcon, CheckIcon, CheckCheckIcon, Trash2Icon, BanIcon, SmileIcon, SearchIcon, ReplyIcon, PencilIcon, PaperclipIcon, FileIcon, DownloadIcon, MicIcon, StopCircleIcon } from "lucide-react"
import useKeyboardSound from "@/hooks/useKeyboardSound"
import toast from "react-hot-toast"
import { cn } from "@/lib/utils"

// Messages within this window from the same sender are visually grouped together.
const GROUP_WINDOW_MS = 5 * 60 * 1000

const isSameDay = (a: string, b: string) => {
  const da = new Date(a)
  const db = new Date(b)
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  )
}

const withinGroupWindow = (a: string, b: string) =>
  Math.abs(new Date(b).getTime() - new Date(a).getTime()) < GROUP_WINDOW_MS

const formatDateSeparator = (date: string) => {
  const d = new Date(date)
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)
  if (isSameDay(date, today.toISOString())) return "Today"
  if (isSameDay(date, yesterday.toISOString())) return "Yesterday"
  return d.toLocaleDateString([], {
    month: "long",
    day: "numeric",
    ...(d.getFullYear() !== today.getFullYear() ? { year: "numeric" } : {}),
  })
}

const getInitials = (name?: string) =>
  name
    ? name
        .trim()
        .split(/\s+/)
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "U"

// Curated set of common emojis for the lightweight composer picker.
const EMOJIS = [
  "😀", "😂", "🤣", "😊", "😍", "😘", "😎", "🤔",
  "😉", "😅", "🙃", "😇", "🥰", "😋", "😴", "🤗",
  "👍", "👎", "👏", "🙏", "💪", "🤝", "✌️", "🤞",
  "❤️", "🔥", "🎉", "✨", "💯", "👀", "😢", "😡",
  "🥳", "😭", "🤯", "😱", "🙄", "😬", "🤩", "😏",
  "👋", "🫶", "💀", "🤡", "🍕", "☕", "🎁", "✅",
]

// Emojis offered in the quick-reaction popover.
const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"]

const MAX_FILE_BYTES = 10 * 1024 * 1024 // 10MB

const formatFileSize = (bytes?: number) => {
  if (!bytes) return ""
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// Per-message hover toolbar (react / reply / edit / delete). Manages its own
// reaction-picker open state so it doesn't need to live in the parent.
function MessageActions({
  message,
  isMyMessage,
  onReact,
  onReply,
  onEdit,
  onDelete,
}: {
  message: any
  isMyMessage: boolean
  onReact: (emoji: string) => void
  onReply: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const [pickerOpen, setPickerOpen] = React.useState(false)
  if (message.deleted) return null

  return (
    <div
      className={cn(
        "relative self-center opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5",
        isMyMessage ? "order-first" : ""
      )}
    >
      {pickerOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setPickerOpen(false)} />
          <div
            className={cn(
              "absolute bottom-full mb-1 z-20 flex items-center gap-0.5 rounded-full border border-border bg-popover px-1.5 py-1 shadow-lg",
              isMyMessage ? "right-0" : "left-0"
            )}
          >
            {QUICK_REACTIONS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => {
                  onReact(emoji)
                  setPickerOpen(false)
                }}
                className="h-7 w-7 flex items-center justify-center rounded-full text-base hover:bg-accent cursor-pointer"
              >
                {emoji}
              </button>
            ))}
          </div>
        </>
      )}

      <button
        type="button"
        onClick={() => setPickerOpen((v) => !v)}
        title="React"
        className="p-1 rounded-md text-muted-foreground hover:text-foreground cursor-pointer"
      >
        <SmileIcon className="size-3.5" />
      </button>
      <button
        type="button"
        onClick={onReply}
        title="Reply"
        className="p-1 rounded-md text-muted-foreground hover:text-foreground cursor-pointer"
      >
        <ReplyIcon className="size-3.5" />
      </button>
      {isMyMessage && message.text && (
        <button
          type="button"
          onClick={onEdit}
          title="Edit"
          className="p-1 rounded-md text-muted-foreground hover:text-foreground cursor-pointer"
        >
          <PencilIcon className="size-3.5" />
        </button>
      )}
      {isMyMessage && (
        <button
          type="button"
          onClick={onDelete}
          title="Delete for everyone"
          className="p-1 rounded-md text-muted-foreground hover:text-destructive cursor-pointer"
        >
          <Trash2Icon className="size-3.5" />
        </button>
      )}
    </div>
  )
}

// Groups reactions by emoji and renders compact count chips under a bubble.
function ReactionChips({ reactions }: { reactions?: { userId: string; emoji: string }[] }) {
  if (!reactions || reactions.length === 0) return null
  const counts: Record<string, number> = {}
  for (const r of reactions) counts[r.emoji] = (counts[r.emoji] || 0) + 1
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {Object.entries(counts).map(([emoji, count]) => (
        <span
          key={emoji}
          className="inline-flex items-center gap-0.5 rounded-full bg-muted border border-border px-1.5 py-0.5 text-[11px] leading-none"
        >
          {emoji}
          {count > 1 && <span className="text-muted-foreground">{count}</span>}
        </span>
      ))}
    </div>
  )
}

// Renders message text with clickable URLs.
const linkifyText = (text: string) => {
  const parts = text.split(/(https?:\/\/[^\s]+)/g)
  return parts.map((part, i) =>
    /^https?:\/\//i.test(part) ? (
      <a
        key={i}
        href={part}
        target="_blank"
        rel="noopener noreferrer"
        className="underline break-all hover:opacity-80"
      >
        {part}
      </a>
    ) : (
      <React.Fragment key={i}>{part}</React.Fragment>
    )
  )
}

// Highlights the first occurrence of `q` within `text` for search results.
const highlightMatch = (text: string, q: string) => {
  if (!q) return text
  const idx = text.toLowerCase().indexOf(q.toLowerCase())
  if (idx === -1) return text
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-yellow-300/60 text-inherit rounded px-0.5">
        {text.slice(idx, idx + q.length)}
      </mark>
      {text.slice(idx + q.length)}
    </>
  )
}

export default function ChatInterface() {
  const {
    messages,
    getMessages,
    isMessagesLoading,
    selectedUser,
    sendMessage,
    isSoundEnabled,
    isTyping,
    emitTyping,
    emitStopTyping,
    deleteMessage,
    messageSearchOpen,
    messageSearchQuery,
    setMessageSearchQuery,
    replyingTo,
    setReplyingTo,
    editingMessage,
    setEditingMessage,
    reactToMessage,
    editMessage,
  } = useChatStore()
  const { authUser } = useAuthStore()
  const { playRandomKeyStrokeSound } = useKeyboardSound()

  const [text, setText] = React.useState("")
  const [imagePreview, setImagePreview] = React.useState<string | null>(null)
  const [filePreview, setFilePreview] = React.useState<{ data: string; name: string; mimetype: string; size: number } | null>(null)
  const [showEmoji, setShowEmoji] = React.useState(false)
  const [isRecording, setIsRecording] = React.useState(false)

  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const docInputRef = React.useRef<HTMLInputElement>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const messageEndRef = React.useRef<HTMLDivElement>(null)
  const typingTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null)
  const audioChunksRef = React.useRef<Blob[]>([])

  const insertEmoji = (emoji: string) => {
    setText((prev) => prev + emoji)
    emitTyping()
    inputRef.current?.focus()
  }

  // When entering edit mode, prefill the composer with the message text
  React.useEffect(() => {
    if (editingMessage) {
      setText(editingMessage.text || "")
      inputRef.current?.focus()
    }
  }, [editingMessage])

  // Fetch messages when selected user changes
  React.useEffect(() => {
    if (selectedUser?._id) {
      getMessages(selectedUser._id)
    }
    // Reset state
    setText("")
    setImagePreview(null)
  }, [selectedUser?._id, getMessages])

  // Scroll to bottom on new messages (and when the typing indicator appears)
  React.useEffect(() => {
    if (messageEndRef.current && messages) {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages, isMessagesLoading, isTyping])

  // Clear any pending typing timeout when unmounting or switching chats
  React.useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    }
  }, [selectedUser?._id])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setText(e.target.value)
    if (isSoundEnabled) {
      playRandomKeyStrokeSound()
    }

    // Broadcast "typing", then schedule a "stopTyping" after a short idle window
    emitTyping()
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    typingTimeoutRef.current = setTimeout(() => {
      emitStopTyping()
    }, 1500)
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

  const handleDocChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > MAX_FILE_BYTES) {
      toast.error("File must be smaller than 10MB")
      return
    }
    const reader = new FileReader()
    reader.onloadend = () => {
      setFilePreview({
        data: reader.result as string,
        name: file.name,
        mimetype: file.type,
        size: file.size,
      })
    }
    reader.readAsDataURL(file)
  }

  const removeFile = () => {
    setFilePreview(null)
    if (docInputRef.current) docInputRef.current.value = ""
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      audioChunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data)
      }
      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType || "audio/webm" })
        // release the mic
        stream.getTracks().forEach((t) => t.stop())
        if (blob.size === 0) return
        const reader = new FileReader()
        reader.onloadend = () => {
          setFilePreview({
            data: reader.result as string,
            name: "Voice message",
            mimetype: blob.type || "audio/webm",
            size: blob.size,
          })
        }
        reader.readAsDataURL(blob)
      }

      mediaRecorderRef.current = recorder
      recorder.start()
      setIsRecording(true)
    } catch {
      toast.error("Microphone access denied")
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop()
    }
    setIsRecording(false)
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()

    // Edit mode — save changes to the existing message instead of sending
    if (editingMessage) {
      if (!text.trim()) return
      await editMessage(editingMessage._id, text.trim())
      setText("")
      setShowEmoji(false)
      return
    }

    if (!text.trim() && !imagePreview && !filePreview) return

    if (isSoundEnabled) {
      playRandomKeyStrokeSound()
    }

    // We're sending now — stop broadcasting "typing" and close the emoji panel
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    emitStopTyping()
    setShowEmoji(false)

    try {
      await sendMessage({
        text: text.trim(),
        image: imagePreview,
        file: filePreview || undefined,
      })
      setText("")
      setImagePreview(null)
      setFilePreview(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
      if (docInputRef.current) {
        docInputRef.current.value = ""
      }
    } catch (error) {
      console.error("Failed to send message:", error)
    }
  }

  if (!selectedUser) return null

  const partnerInitials = getInitials(selectedUser.fullName)
  const myInitials = getInitials(authUser?.fullName)

  // In-conversation search
  const searchQ = messageSearchQuery.trim()
  const searchActive = messageSearchOpen && searchQ.length > 0
  const searchResults = searchActive
    ? messages.filter((m: any) => !m.deleted && m.text && m.text.toLowerCase().includes(searchQ.toLowerCase()))
    : []

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50/20 dark:bg-slate-900/10">
      {/* MESSAGE VIEWPORT */}
      <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-4 min-h-0">
        {/* In-conversation search bar */}
        {messageSearchOpen && (
          <div className="sticky top-0 z-10 -mx-4 -mt-4 mb-2 px-4 py-2 bg-background/80 backdrop-blur-md border-b border-border">
            <div className="max-w-3xl mx-auto relative">
              <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
              <Input
                autoFocus
                value={messageSearchQuery}
                onChange={(e) => setMessageSearchQuery(e.target.value)}
                placeholder="Search in conversation…"
                className="pl-8 h-9"
              />
            </div>
          </div>
        )}

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
        ) : searchActive ? (
          /* Search Results */
          <div className="max-w-3xl mx-auto space-y-2">
            <p className="text-center text-[11px] text-muted-foreground py-1">
              {searchResults.length} result{searchResults.length !== 1 ? "s" : ""}
            </p>
            {searchResults.map((message: any) => {
              const isMyMessage = message.senderId === authUser?._id
              return (
                <div key={message._id} className={cn("flex", isMyMessage ? "justify-end" : "justify-start")}>
                  <div
                    className={cn(
                      "rounded-2xl px-4 py-2.5 text-sm max-w-[70%] w-fit",
                      isMyMessage ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    )}
                  >
                    <p className="whitespace-pre-wrap break-words leading-normal">
                      {highlightMatch(message.text, searchQ)}
                    </p>
                    <span className="block text-[9px] opacity-70 mt-1">
                      {new Date(message.createdAt).toLocaleString([], {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
              )
            })}
            {searchResults.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-8">No messages found</p>
            )}
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
          <div className="max-w-3xl mx-auto space-y-1">
            {messages.map((message: any, index: number) => {
              const isMyMessage = message.senderId === authUser?._id
              const prev = messages[index - 1]
              const next = messages[index + 1]

              // Show a date divider whenever the calendar day changes.
              const showDateSeparator =
                !prev || !isSameDay(prev.createdAt, message.createdAt)

              // First/last message in a run from the same sender (within the group window).
              const isFirstInGroup =
                showDateSeparator ||
                prev.senderId !== message.senderId ||
                !withinGroupWindow(prev.createdAt, message.createdAt)

              const isLastInGroup =
                !next ||
                next.senderId !== message.senderId ||
                !isSameDay(message.createdAt, next.createdAt) ||
                !withinGroupWindow(message.createdAt, next.createdAt)

              return (
                <React.Fragment key={message._id}>
                  {showDateSeparator && (
                    <div className="flex items-center justify-center py-4">
                      <span className="rounded-full bg-muted px-3 py-1 text-[10px] font-medium text-muted-foreground">
                        {formatDateSeparator(message.createdAt)}
                      </span>
                    </div>
                  )}

                  <div
                    className={cn(
                      "group flex gap-2 items-end",
                      isMyMessage ? "justify-end" : "justify-start",
                      isFirstInGroup ? "mt-3" : "mt-0.5"
                    )}
                  >
                    {/* Left avatar slot for partner — rendered once per group */}
                    {!isMyMessage &&
                      (isLastInGroup ? (
                        <Avatar className="h-8 w-8 rounded-full border border-border shrink-0">
                          <AvatarImage src={selectedUser.profilePic} alt={selectedUser.fullName} />
                          <AvatarFallback className="text-[10px] bg-muted text-muted-foreground font-semibold">
                            {partnerInitials}
                          </AvatarFallback>
                        </Avatar>
                      ) : (
                        <div className="w-8 shrink-0" />
                      ))}

                    {/* Hover action toolbar for my own messages (sits to the left) */}
                    {isMyMessage && (
                      <MessageActions
                        message={message}
                        isMyMessage={isMyMessage}
                        onReact={(emoji) => reactToMessage(message._id, emoji)}
                        onReply={() => setReplyingTo(message)}
                        onEdit={() => setEditingMessage(message)}
                        onDelete={() => deleteMessage(message._id)}
                      />
                    )}

                    {/* Message column */}
                    <div className={cn("flex flex-col max-w-[70%]", isMyMessage ? "items-end" : "items-start")}>
                      {message.deleted ? (
                        <div
                          className={cn(
                            "px-4 py-2.5 text-sm w-fit rounded-2xl border italic flex items-center gap-1.5 text-muted-foreground bg-muted/50 border-border",
                            isLastInGroup && (isMyMessage ? "rounded-br-md" : "rounded-bl-md")
                          )}
                        >
                          <BanIcon className="size-3.5 opacity-70 shrink-0" />
                          <span className="opacity-70">This message was deleted</span>
                        </div>
                      ) : (
                        <div
                          className={cn(
                            "px-4 py-2.5 text-sm shadow-none border border-transparent whitespace-pre-wrap break-words w-fit rounded-2xl",
                            isMyMessage
                              ? "bg-primary text-primary-foreground border-primary/10"
                              : "bg-muted text-muted-foreground border-border",
                            // Subtle tail toward the avatar on the last message of a group
                            isLastInGroup && (isMyMessage ? "rounded-br-md" : "rounded-bl-md")
                          )}
                        >
                          {/* Quoted reply preview */}
                          {message.replyTo && (
                            <div
                              className={cn(
                                "mb-1.5 rounded-md border-l-2 px-2 py-1 text-xs",
                                isMyMessage
                                  ? "border-primary-foreground/40 bg-primary-foreground/10"
                                  : "border-primary bg-background/50"
                              )}
                            >
                              <p className="opacity-80 line-clamp-2">
                                {message.replyTo.deleted
                                  ? "Deleted message"
                                  : message.replyTo.text || (message.replyTo.image ? "📷 Photo" : "")}
                              </p>
                            </div>
                          )}

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

                          {/* Audio / File render */}
                          {message.file?.url &&
                            (message.file.mimetype?.startsWith("audio/") ? (
                              <audio controls src={message.file.url} className="mb-1.5 h-10 max-w-[240px]" />
                            ) : (
                              <a
                                href={message.file.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={cn(
                                  "flex items-center gap-2 rounded-lg border px-3 py-2 mb-1.5 max-w-[240px] no-underline",
                                  isMyMessage
                                    ? "border-primary-foreground/20 bg-primary-foreground/10"
                                    : "border-border bg-background/50"
                                )}
                              >
                                <FileIcon className="size-5 shrink-0 opacity-80" />
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-xs font-medium">{message.file.name}</p>
                                  <p className="text-[10px] opacity-70">{formatFileSize(message.file.size)}</p>
                                </div>
                                <DownloadIcon className="size-4 shrink-0 opacity-70" />
                              </a>
                            ))}

                          {/* Text render */}
                          {message.text && <p className="leading-normal">{linkifyText(message.text)}</p>}

                          {/* Link preview card */}
                          {message.linkPreview && (
                            <a
                              href={message.linkPreview.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={cn(
                                "mt-1.5 block rounded-lg overflow-hidden border no-underline max-w-[260px]",
                                isMyMessage
                                  ? "border-primary-foreground/20 bg-primary-foreground/10"
                                  : "border-border bg-background/50"
                              )}
                            >
                              {message.linkPreview.image && (
                                <img
                                  src={message.linkPreview.image}
                                  alt=""
                                  className="w-full max-h-[120px] object-cover"
                                />
                              )}
                              <div className="px-2.5 py-1.5">
                                {message.linkPreview.siteName && (
                                  <p className="text-[10px] opacity-60 truncate">{message.linkPreview.siteName}</p>
                                )}
                                {message.linkPreview.title && (
                                  <p className="text-xs font-medium line-clamp-2">{message.linkPreview.title}</p>
                                )}
                                {message.linkPreview.description && (
                                  <p className="text-[11px] opacity-70 line-clamp-2 mt-0.5">
                                    {message.linkPreview.description}
                                  </p>
                                )}
                              </div>
                            </a>
                          )}
                        </div>
                      )}

                      {/* Reactions */}
                      {!message.deleted && <ReactionChips reactions={message.reactions} />}

                      {/* Timestamp + edited marker + read receipt, only on the last message of a group */}
                      {isLastInGroup && (
                        <div className="flex items-center gap-1 px-1 mt-1 leading-none">
                          <span className="text-[9px] text-muted-foreground/75">
                            {new Date(message.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          {message.editedAt && !message.deleted && (
                            <span className="text-[9px] text-muted-foreground/60 italic">edited</span>
                          )}
                          {isMyMessage && !message.deleted &&
                            (message.status === "read" ? (
                              <CheckCheckIcon className="size-3 text-sky-500" />
                            ) : message.status === "delivered" ? (
                              <CheckCheckIcon className="size-3 text-muted-foreground/60" />
                            ) : (
                              <CheckIcon className="size-3 text-muted-foreground/60" />
                            ))}
                        </div>
                      )}
                    </div>

                    {/* Hover action toolbar for partner messages (sits to the right) */}
                    {!isMyMessage && (
                      <MessageActions
                        message={message}
                        isMyMessage={isMyMessage}
                        onReact={(emoji) => reactToMessage(message._id, emoji)}
                        onReply={() => setReplyingTo(message)}
                        onEdit={() => setEditingMessage(message)}
                        onDelete={() => deleteMessage(message._id)}
                      />
                    )}

                    {/* Right avatar slot for authUser — rendered once per group */}
                    {isMyMessage &&
                      (isLastInGroup ? (
                        <Avatar className="h-8 w-8 rounded-full border border-border shrink-0">
                          <AvatarImage src={authUser?.profilePic} alt={authUser?.fullName} />
                          <AvatarFallback className="text-[10px] bg-muted text-muted-foreground font-semibold">
                            {myInitials}
                          </AvatarFallback>
                        </Avatar>
                      ) : (
                        <div className="w-8 shrink-0" />
                      ))}
                  </div>
                </React.Fragment>
              )
            })}
          </div>
        )}

        {/* Typing indicator */}
        {isTyping && (
          <div className="max-w-3xl mx-auto flex gap-2 items-end justify-start mt-3">
            <Avatar className="h-8 w-8 rounded-full border border-border shrink-0">
              <AvatarImage src={selectedUser.profilePic} alt={selectedUser.fullName} />
              <AvatarFallback className="text-[10px] bg-muted text-muted-foreground font-semibold">
                {partnerInitials}
              </AvatarFallback>
            </Avatar>
            <div className="bg-muted text-muted-foreground rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-1">
              <span className="size-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:-0.3s]" />
              <span className="size-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:-0.15s]" />
              <span className="size-1.5 rounded-full bg-muted-foreground/50 animate-bounce" />
            </div>
          </div>
        )}

        <div ref={messageEndRef} />
      </div>

      {/* INPUT CONTAINER */}
      <div className="p-4 border-t border-slate-200/50 dark:border-slate-800/50 bg-background/50 backdrop-blur-md">
        {/* Reply / edit context banner */}
        {(replyingTo || editingMessage) && (
          <div className="max-w-3xl mx-auto mb-2 flex items-center gap-2 rounded-lg border-l-2 border-primary bg-muted/50 px-3 py-2">
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-medium text-primary">
                {editingMessage
                  ? "Editing message"
                  : `Replying to ${replyingTo.senderId === authUser?._id ? "yourself" : selectedUser.fullName}`}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {editingMessage
                  ? editingMessage.text
                  : replyingTo.deleted
                  ? "Deleted message"
                  : replyingTo.text || (replyingTo.image ? "📷 Photo" : "")}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                if (editingMessage) {
                  setEditingMessage(null)
                  setText("")
                } else {
                  setReplyingTo(null)
                }
              }}
              className="p-1 rounded-md text-muted-foreground hover:text-foreground cursor-pointer shrink-0"
            >
              <XIcon className="size-4" />
            </button>
          </div>
        )}

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

        {/* File attachment preview */}
        {filePreview && (
          <div className="max-w-3xl mx-auto mb-3 flex items-center">
            <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2 max-w-[280px]">
              <FileIcon className="size-5 shrink-0 opacity-80" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium">{filePreview.name}</p>
                <p className="text-[10px] text-muted-foreground">{formatFileSize(filePreview.size)}</p>
              </div>
              <button
                type="button"
                onClick={removeFile}
                className="shrink-0 text-muted-foreground hover:text-destructive cursor-pointer"
              >
                <XIcon className="size-4" />
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSendMessage} className="max-w-3xl mx-auto flex space-x-2 relative">
          {/* File Input (Hidden) */}
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={handleImageChange}
            className="hidden"
          />

          {/* Emoji picker */}
          {showEmoji && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowEmoji(false)} />
              <div className="absolute bottom-full left-0 mb-2 z-20 w-[280px] rounded-xl border border-border bg-popover p-2 shadow-lg">
                <div className="grid grid-cols-8 gap-0.5">
                  {EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => insertEmoji(emoji)}
                      className="h-8 w-8 flex items-center justify-center rounded-md text-lg hover:bg-accent cursor-pointer"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Emoji Button */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setShowEmoji((v) => !v)}
            className={cn(
              "h-10 w-10 shrink-0 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800",
              showEmoji && "text-primary hover:text-primary/80"
            )}
          >
            <SmileIcon className="h-5 w-5" />
          </Button>

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

          {/* Document/File Input (Hidden) */}
          <input
            type="file"
            ref={docInputRef}
            onChange={handleDocChange}
            className="hidden"
          />

          {/* Attach File Button */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => docInputRef.current?.click()}
            className={cn(
              "h-10 w-10 shrink-0 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800",
              filePreview && "text-primary hover:text-primary/80"
            )}
          >
            <PaperclipIcon className="h-5 w-5" />
          </Button>

          {/* Voice Record Button */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={isRecording ? stopRecording : startRecording}
            title={isRecording ? "Stop recording" : "Record voice message"}
            className={cn(
              "h-10 w-10 shrink-0 rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800",
              isRecording
                ? "text-red-500 hover:text-red-600 animate-pulse"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {isRecording ? <StopCircleIcon className="h-5 w-5" /> : <MicIcon className="h-5 w-5" />}
          </Button>

          {/* Input text */}
          <Input
            ref={inputRef}
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
