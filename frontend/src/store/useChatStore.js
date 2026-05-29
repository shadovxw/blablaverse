import { create } from "zustand";
import { axiosInstanstnce } from "../lib/axios.js";
import { socket } from "../lib/socket.js";
import toast from "react-hot-toast";

export const useChatStore = create((set, get) => ({
    allContacts: [],
    chats: [],
    groups: [],
    messages: [],
    activeTab: "chats",
    selectedUser: null,
    selectedGroup: null,
    isUsersLoading: false,
    isGroupsLoading: false,
    isMessagesLoading: false,
    isTyping: false,
    messageSearchOpen: false,
    messageSearchQuery: "",
    replyingTo: null,
    editingMessage: null,
    groupInfoOpen: false,
    isSoundEnabled: localStorage.getItem("soundEnabled") === "true",

    setGroupInfoOpen: (v) => set({ groupInfoOpen: v }),

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
            selectedGroup: null,
            isTyping: false,
            messageSearchOpen: false,
            messageSearchQuery: "",
            replyingTo: null,
            editingMessage: null,
            groupInfoOpen: false,
        }),

    setSelectedGroup: (group) =>
        set({
            selectedGroup: group,
            selectedUser: null,
            isTyping: false,
            messageSearchOpen: false,
            messageSearchQuery: "",
            replyingTo: null,
            editingMessage: null,
            groupInfoOpen: false,
        }),

    // ---- realtime ----
    subscribeToChat: () => {
        socket.off("newMessage");
        socket.on("newMessage", (newMessage) => {
            const { selectedUser, selectedGroup, messages } = get();
            if (newMessage.groupId) {
                // group message
                if (selectedGroup && newMessage.groupId === selectedGroup._id) {
                    set({ messages: [...messages, newMessage] });
                    get().markGroupRead(selectedGroup._id);
                }
                get().getGroups();
            } else {
                // 1:1 message
                const isFromOpenChat = selectedUser && newMessage.senderId === selectedUser._id;
                if (isFromOpenChat) {
                    set({ messages: [...messages, newMessage] });
                    get().markMessagesAsRead(newMessage.senderId);
                }
                get().getMyChatPartners();
            }
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

        // group lifecycle events
        socket.off("newGroup");
        socket.on("newGroup", (group) => {
            const exists = get().groups.some((g) => g._id === group._id);
            if (!exists) set({ groups: [group, ...get().groups] });
        });

        socket.off("groupUpdated");
        socket.on("groupUpdated", (group) => {
            get().applyGroupUpdate(group);
        });

        socket.off("removedFromGroup");
        socket.on("removedFromGroup", ({ groupId }) => {
            set({
                groups: get().groups.filter((g) => g._id !== groupId),
                selectedGroup: get().selectedGroup?._id === groupId ? null : get().selectedGroup,
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
        socket.off("newGroup");
        socket.off("groupUpdated");
        socket.off("removedFromGroup");
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

    getGroups: async () => {
        set({ isGroupsLoading: true });
        try {
            const res = await axiosInstanstnce.get("/groups");
            set({ groups: res.data });
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to load groups");
        } finally {
            set({ isGroupsLoading: false });
        }
    },

    createGroup: async (data) => {
        try {
            const res = await axiosInstanstnce.post("/groups", data);
            set({ groups: [res.data, ...get().groups] });
            return res.data;
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to create group");
            return null;
        }
    },

    getGroupMessages: async (groupId) => {
        set({ isMessagesLoading: true });
        try {
            const res = await axiosInstanstnce.get(`/groups/${groupId}/messages`);
            set({ messages: res.data });
            // opening clears the unread badge optimistically
            set({
                groups: get().groups.map((g) =>
                    g._id === groupId ? { ...g, unreadCount: 0 } : g
                ),
            });
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to load messages");
        } finally {
            set({ isMessagesLoading: false });
        }
    },

    markGroupRead: async (groupId) => {
        set({
            groups: get().groups.map((g) =>
                g._id === groupId ? { ...g, unreadCount: 0 } : g
            ),
        });
        try {
            await axiosInstanstnce.put(`/groups/${groupId}/read`);
        } catch {
            // non-critical
        }
    },

    updateGroup: async (groupId, data) => {
        try {
            const res = await axiosInstanstnce.put(`/groups/${groupId}`, data);
            get().applyGroupUpdate(res.data);
            return res.data;
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to update group");
            return null;
        }
    },

    addGroupMembers: async (groupId, memberIds) => {
        try {
            const res = await axiosInstanstnce.post(`/groups/${groupId}/members`, { memberIds });
            get().applyGroupUpdate(res.data);
            return res.data;
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to add members");
            return null;
        }
    },

    removeGroupMember: async (groupId, userId) => {
        try {
            const res = await axiosInstanstnce.delete(`/groups/${groupId}/members/${userId}`);
            get().applyGroupUpdate(res.data);
            return res.data;
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to remove member");
            return null;
        }
    },

    setGroupAdmin: async (groupId, userId, makeAdmin) => {
        try {
            const res = await axiosInstanstnce.put(`/groups/${groupId}/members/${userId}/admin`, { makeAdmin });
            get().applyGroupUpdate(res.data);
            return res.data;
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to update admin");
            return null;
        }
    },

    leaveGroup: async (groupId) => {
        try {
            await axiosInstanstnce.post(`/groups/${groupId}/leave`);
            set({
                groups: get().groups.filter((g) => g._id !== groupId),
                selectedGroup: get().selectedGroup?._id === groupId ? null : get().selectedGroup,
            });
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to leave group");
        }
    },

    // merge an updated group into the list + the open group
    applyGroupUpdate: (group) => {
        const exists = get().groups.some((g) => g._id === group._id);
        set({
            groups: exists
                ? get().groups.map((g) => (g._id === group._id ? { ...g, ...group } : g))
                : [group, ...get().groups],
            selectedGroup:
                get().selectedGroup?._id === group._id
                    ? { ...get().selectedGroup, ...group }
                    : get().selectedGroup,
        });
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
        const { selectedUser, selectedGroup, messages, replyingTo } = get();
        const payload = { ...messageData, replyTo: replyingTo?._id || null };
        try {
            let res;
            if (selectedGroup) {
                res = await axiosInstanstnce.post(`/groups/${selectedGroup._id}/messages`, payload);
                set({ messages: [...messages, res.data], replyingTo: null });
                get().getGroups();
            } else {
                res = await axiosInstanstnce.post(`/messages/send/${selectedUser._id}`, payload);
                set({ messages: [...messages, res.data], replyingTo: null });
            }
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