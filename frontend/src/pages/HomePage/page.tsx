import * as React from "react"
import { MessageSquareDashedIcon } from "lucide-react"

export default function HomePage() {
  return (
    <div className="flex h-full min-h-[500px] w-full flex-col items-center justify-center text-center p-8 select-none">
      <div className="flex flex-col items-center justify-center max-w-[320px] mx-auto gap-4">
        {/* Icon Container */}
        <div className="flex aspect-square size-14 items-center justify-center rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 text-slate-400 dark:text-slate-500 shadow-none mb-1">
          <MessageSquareDashedIcon className="size-6" />
        </div>

        {/* Text Details */}
        <div className="space-y-1.5">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            No active chat
          </h2>
          <p className="text-xs text-slate-400 dark:text-slate-500 leading-normal">
            Select a conversation or contact from the sidebar to start chatting.
          </p>
        </div>
      </div>
    </div>
  )
}