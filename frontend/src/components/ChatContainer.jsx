
import { useEffect, useRef } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import ChatHeader from "./ChatHeader";
import MessageInput from "./MessageInput";
import MessagesLoadingSkeleton from "./MessageLoadingSkeleton";
import NoChatHistoryPlaceholder from "./NoChatHistoryPlaceholder";

export default function ChatContainer() {
    const { messages, getMessages, isMessagesLoading, selectedUser } = useChatStore();
    const { authUser } = useAuthStore();
    const messageEndRef = useRef(null);

    useEffect(() => {
        if (selectedUser?._id) {
            getMessages(selectedUser._id);
        }
    }, [selectedUser?._id, getMessages]);

    useEffect(() => {
        if (messageEndRef.current && messages) {
            messageEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages]);

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-900/30">
            <ChatHeader />

            <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
                {isMessagesLoading ? (
                    <MessagesLoadingSkeleton />
                ) : messages.length === 0 ? (
                    <NoChatHistoryPlaceholder name={selectedUser.fullName} />
                ) : (
                    <div className="max-w-3xl mx-auto space-y-4">
                        {messages.map((message) => {
                            const isMyMessage = message.senderId === authUser._id;
                            return (
                                <div
                                    key={message._id}
                                    className={`chat ${isMyMessage ? "chat-end" : "chat-start"}`}
                                >
                                    <div className="chat-image avatar">
                                        <div className="size-10 rounded-full border border-slate-700/50">
                                            <img
                                                src={
                                                    isMyMessage
                                                        ? authUser.profilePic || "/avatar.png"
                                                        : selectedUser.profilePic || "/avatar.png"
                                                }
                                                alt="profile"
                                            />
                                        </div>
                                    </div>
                                    <div className="chat-header mb-1 text-xs opacity-50 text-slate-400">
                                        <time className="text-[10px] ml-1">
                                            {new Date(message.createdAt).toLocaleTimeString([], {
                                                hour: "2-digit",
                                                minute: "2-digit",
                                            })}
                                        </time>
                                    </div>
                                    <div
                                        className={`chat-bubble flex flex-col gap-2 ${
                                            isMyMessage
                                                ? "bg-cyan-500 text-white"
                                                : "bg-slate-800 text-slate-100"
                                        }`}
                                    >
                                        {message.image && (
                                            <img
                                                src={message.image}
                                                alt="Attachment"
                                                className="max-w-[200px] rounded-md"
                                            />
                                        )}
                                        {message.text && (
                                            <p className="whitespace-pre-wrap">{message.text}</p>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                        <div ref={messageEndRef} />
                    </div>
                )}
            </div>

            <MessageInput />
        </div>
    );
}