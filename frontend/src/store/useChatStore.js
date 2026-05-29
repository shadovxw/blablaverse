import { create } from "zustand";
import { axiosInstanstnce } from "../lib/axios.js";
import { socket } from "../lib/socket.js";
import toast from "react-hot-toast";

export const useChatStore = create((set, get) => ({
    allContacts: [],
    chats: [],
    messages: [],
    activeTab: "chats",
    selectedUser: null,
    isUsersLoading: false,
    isMessagesLoading: false,
    isTyping: false,
    messageSearchOpen: false,
    messageSearchQuery: "",
    replyingTo: null,
    editingMessage: null,
    isSoundEnabled: localStorage.getItem("soundEnabled") === "true",

    setReplyingTo: (msg) => set({ replyingTo: msg, editingMessage: null }),
    setEditingMessage: (msg) => set({ editingMessage: msg, replyingTo: null }),

    toggleMessageSearch: () =>
        set((s) => ({ messageSearchOpen: !s.messageSearchOpen, messageSearchQuery: "" })),
    setMessageSearchQuery: (q) => set({ messageSearchQuery: q }),

    toggleSound: () => {
        const newState = !get().isSoundEnabled;
        localStorage.setItem("soundEnabled", newState.toString());
        set({ isSoundEnabled: newState });
    },

    setActiveTab: (tab) => set({ activeTab: tab }),
    setSelectedUser: (user) =>
        set({
            selectedUser: user,
            isTyping: false,
            messageSearchOpen: false,
            messageSearchQuery: "",
            replyingTo: null,
            editingMessage: null,
        }),

    // ---- realtime ----
    subscribeToChat: () => {
        socket.off("newMessage");
        socket.on("newMessage", (newMessage) => {
            const { selectedUser, messages } = get();
            const isFromOpenChat = selectedUser && newMessage.senderId === selectedUser._id;
            if (isFromOpenChat) {
                set({ messages: [...messages, newMessage] });
                // we're looking at this chat — immediately mark it read
                get().markMessagesAsRead(newMessage.senderId);
            }
            // refresh the chat list so new conversations and ordering stay current
            get().getMyChatPartners();
        });

        socket.off("typing");
        socket.on("typing", ({ senderId }) => {
            const { selectedUser } = get();
            if (selectedUser && senderId === selectedUser._id) set({ isTyping: true });
        });

        socket.off("stopTyping");
        socket.on("stopTyping", ({ senderId }) => {
            const { selectedUser } = get();
            if (selectedUser && senderId === selectedUser._id) set({ isTyping: false });
        });

        // a partner read the messages I sent them → turn my ticks "read"
        socket.off("messagesRead");
        socket.on("messagesRead", ({ by }) => {
            const { selectedUser, messages } = get();
            if (selectedUser && by === selectedUser._id) {
                set({
                    messages: messages.map((m) =>
                        m.senderId !== by ? { ...m, status: "read" } : m
                    ),
                });
            }
        });

        // a message was deleted for everyone
        socket.off("messageDeleted");
        socket.on("messageDeleted", ({ messageId }) => {
            const { messages } = get();
            set({
                messages: messages.map((m) =>
                    m._id === messageId ? { ...m, deleted: true, text: "", image: undefined } : m
                ),
            });
        });

        // a reaction was added/removed on a message
        socket.off("messageReaction");
        socket.on("messageReaction", ({ messageId, reactions }) => {
            set({
                messages: get().messages.map((m) =>
                    m._id === messageId ? { ...m, reactions } : m
                ),
            });
        });

        // a message was edited
        socket.off("messageEdited");
        socket.on("messageEdited", ({ messageId, text, editedAt }) => {
            set({
                messages: get().messages.map((m) =>
                    m._id === messageId ? { ...m, text, editedAt } : m
                ),
            });
        });

        // a link preview was generated for a message
        socket.off("messageLinkPreview");
        socket.on("messageLinkPreview", ({ messageId, linkPreview }) => {
            set({
                messages: get().messages.map((m) =>
                    m._id === messageId ? { ...m, linkPreview } : m
                ),
            });
        });
    },

    unsubscribeFromChat: () => {
        socket.off("newMessage");
        socket.off("typing");
        socket.off("stopTyping");
        socket.off("messagesRead");
        socket.off("messageDeleted");
        socket.off("messageReaction");
        socket.off("messageEdited");
        socket.off("messageLinkPreview");
    },

    emitTyping: () => {
        const { selectedUser } = get();
        if (selectedUser) socket.emit("typing", { receiverId: selectedUser._id });
    },

    emitStopTyping: () => {
        const { selectedUser } = get();
        if (selectedUser) socket.emit("stopTyping", { receiverId: selectedUser._id });
    },

    getMyChatPartners: async () => {
        set({ isUsersLoading: true });
        try {
            const res = await axiosInstanstnce.get("/messages/chats");
            set({ chats: res.data });
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to load chats");
        } finally {
            set({ isUsersLoading: false });
        }
    },

    getAllContacts: async () => {
        set({ isUsersLoading: true });
        try {
            const res = await axiosInstanstnce.get("/messages/contacts");
            set({ allContacts: res.data });
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to load contacts");
        } finally {
            set({ isUsersLoading: false });
        }
    },

    getMessages: async (userId) => {
        set({ isMessagesLoading: true });
        try {
            const res = await axiosInstanstnce.get(`/messages/${userId}`);
            set({ messages: res.data });
            // opening the chat marks the partner's messages as read
            get().markMessagesAsRead(userId);
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to load messages");
        } finally {
            set({ isMessagesLoading: false });
        }
    },

    markMessagesAsRead: async (userId) => {
        // optimistically clear the unread badge for this chat
        set({
            chats: get().chats.map((c) =>
                c._id === userId ? { ...c, unreadCount: 0 } : c
            ),
        });
        try {
            await axiosInstanstnce.put(`/messages/read/${userId}`);
        } catch {
            // non-critical — receipts will reconcile on next load
        }
    },

    deleteMessage: async (messageId) => {
        const { messages } = get();
        try {
            const res = await axiosInstanstnce.delete(`/messages/${messageId}`);
            set({
                messages: messages.map((m) => (m._id === messageId ? res.data : m)),
            });
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to delete message");
        }
    },

    sendMessage: async (messageData) => {
        const { selectedUser, messages, replyingTo } = get();
        try {
            const res = await axiosInstanstnce.post(`/messages/send/${selectedUser._id}`, {
                ...messageData,
                replyTo: replyingTo?._id || null,
            });
            set({ messages: [...messages, res.data], replyingTo: null });
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to send message");
        }
    },

    reactToMessage: async (messageId, emoji) => {
        try {
            const res = await axiosInstanstnce.put(`/messages/react/${messageId}`, { emoji });
            set({
                messages: get().messages.map((m) =>
                    m._id === messageId ? { ...m, reactions: res.data } : m
                ),
            });
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to react");
        }
    },

    editMessage: async (messageId, text) => {
        try {
            const res = await axiosInstanstnce.put(`/messages/edit/${messageId}`, { text });
            set({
                messages: get().messages.map((m) =>
                    m._id === messageId ? { ...m, text: res.data.text, editedAt: res.data.editedAt } : m
                ),
                editingMessage: null,
            });
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to edit message");
        }
    },
}));