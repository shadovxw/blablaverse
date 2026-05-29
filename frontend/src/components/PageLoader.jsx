import { Loader2Icon } from "lucide-react"

export default function PageLoader() {
  return (
    <div className="flex items-center justify-center h-screen bg-background">
      <Loader2Icon className="size-8 animate-spin text-muted-foreground" />
    </div>
  )
}
