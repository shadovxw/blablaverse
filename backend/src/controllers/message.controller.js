import cloudinary from "../lib/cloudinary.js";
import { getReceiverSocketId, io } from "../lib/socket.js";
import Message from "../models/Message.js";
import User from "../models/User.js";
import Group from "../models/Group.js";

// True if the user may act within this message's conversation (1:1 party or group member).
const isParticipant = async (message, userId) => {
    if (message.groupId) {
        const group = await Group.findById(message.groupId).select("members");
        return !!group && group.members.some((m) => m.equals(userId));
    }
    return message.senderId.equals(userId) || message.receiverId.equals(userId);
};

// Emit an event to everyone in the message's conversation except the actor.
const emitToConversation = async (message, event, payload, actorId) => {
    if (message.groupId) {
        const group = await Group.findById(message.groupId).select("members");
        if (!group) return;
        for (const m of group.members) {
            if (m.equals(actorId)) continue;
            const sid = getReceiverSocketId(m.toString());
            if (sid) io.to(sid).emit(event, payload);
        }
    } else {
        const otherId = message.senderId.equals(actorId) ? message.receiverId : message.senderId;
        const sid = getReceiverSocketId(otherId.toString());
        if (sid) io.to(sid).emit(event, payload);
    }
};

const URL_REGEX = /(https?:\/\/[^\s]+)/i;

const extractFirstUrl = (text) => {
    if (!text) return null;
    const match = text.match(URL_REGEX);
    return match ? match[0] : null;
};

const matchMeta = (html, patterns) => {
    for (const re of patterns) {
        const m = html.match(re);
        if (m && m[1]) return m[1].trim();
    }
    return null;
};

// Lightweight Open Graph fetcher — best-effort, never throws.
const fetchLinkPreview = async (url) => {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4000);
        const resp = await fetch(url, {
            signal: controller.signal,
            headers: { "User-Agent": "Mozilla/5.0 (compatible; BlablaverseBot/1.0)" },
        });
        clearTimeout(timeout);

        const contentType = resp.headers.get("content-type") || "";
        if (!contentType.includes("text/html")) return null;

        const html = (await resp.text()).slice(0, 500000);
        const title = matchMeta(html, [
            /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i,
            /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i,
            /<title[^>]*>([^<]+)<\/title>/i,
        ]);
        const description = matchMeta(html, [
            /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i,
            /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i,
        ]);
        const image = matchMeta(html, [
            /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
        ]);
        const siteName = matchMeta(html, [
            /<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["']/i,
        ]);

        if (!title && !description && !image) return null;
        return { url, title, description, image, siteName };
    } catch {
        return null;
    }
};

export const getAllContacts = async (req, res) => {
    try {
        const loggedInUserId = req.user._id;
        const filteredUsers = await User.find({ _id: { $ne: loggedInUserId } }).select("-password");

        res.status(200).json(filteredUsers);
    } catch (error) {
        console.log("Error in getAllContacts:", error);
        res.status(500).json({ message: "Server error" });
    }
};

export const getMessagesByUserId = async (req, res) => {
    try {
        const myId = req.user._id;
        const { id: userToChatId } = req.params;

        const messages = await Message.find({
            $or: [
                { senderId: myId, receiverId: userToChatId },
                { senderId: userToChatId, receiverId: myId },
            ],
        }).populate("replyTo", "text image senderId deleted");

        res.status(200).json(messages);
    } catch (error) {
        console.log("Error in getMessages controller: ", error.message);
        res.status(500).json({ error: "Internal server error" });
    }
};

export const sendMessage = async (req, res) => {
    try {
        const { text, image, file, replyTo } = req.body;
        const { id: receiverId } = req.params;
        const senderId = req.user._id;

        if (!text && !image && !file) {
            return res.status(400).json({ message: "Text, image, or file is required." });
        }
        if (senderId.equals(receiverId)) {
            return res.status(400).json({ message: "Cannot send messages to yourself." });
        }
        const receiverExists = await User.exists({ _id: receiverId });
        if (!receiverExists) {
            return res.status(404).json({ message: "Receiver not found." });
        }

        let imageUrl;
        if (image) {
            // upload base64 image to cloudinary
            const uploadResponse = await cloudinary.uploader.upload(image);
            imageUrl = uploadResponse.secure_url;
        }

        let fileData;
        if (file?.data) {
            // upload arbitrary files (pdf, docs, etc.) — resource_type "auto" detects the kind
            const uploadResponse = await cloudinary.uploader.upload(file.data, {
                resource_type: "auto",
            });
            fileData = {
                url: uploadResponse.secure_url,
                name: file.name,
                mimetype: file.mimetype,
                size: file.size,
            };
        }

        const receiverSocketId = getReceiverSocketId(receiverId);

        const newMessage = new Message({
            senderId,
            receiverId,
            text,
            image: imageUrl,
            file: fileData,
            replyTo: replyTo || null,
            // if the receiver is currently connected, mark as delivered right away
            status: receiverSocketId ? "delivered" : "sent",
        });

        await newMessage.save();
        // populate the quoted message so both sides can render the reply preview
        await newMessage.populate("replyTo", "text image senderId deleted");

        if (receiverSocketId) {
            io.to(receiverSocketId).emit("newMessage", newMessage);
        }

        res.status(201).json(newMessage);

        // Generate a link preview asynchronously so it never delays the send.
        const url = extractFirstUrl(text);
        if (url) {
            fetchLinkPreview(url)
                .then(async (preview) => {
                    if (!preview) return;
                    newMessage.linkPreview = preview;
                    await newMessage.save();
                    const payload = { messageId: newMessage._id.toString(), linkPreview: preview };
                    if (receiverSocketId) io.to(receiverSocketId).emit("messageLinkPreview", payload);
                    const senderSocketId = getReceiverSocketId(senderId.toString());
                    if (senderSocketId) io.to(senderSocketId).emit("messageLinkPreview", payload);
                })
                .catch(() => {});
        }
        return;
    } catch (error) {
        console.log("Error in sendMessage controller: ", error.message);
        res.status(500).json({ error: "Internal server error" });
    }
};

export const markMessagesAsRead = async (req, res) => {
    try {
        const myId = req.user._id;
        const { id: senderId } = req.params; // the partner whose messages I'm reading

        await Message.updateMany(
            { senderId, receiverId: myId, status: { $ne: "read" } },
            { $set: { status: "read" } }
        );

        // notify the sender (if online) so their ticks turn "read"
        const senderSocketId = getReceiverSocketId(senderId);
        if (senderSocketId) {
            io.to(senderSocketId).emit("messagesRead", { by: myId.toString() });
        }

        res.status(200).json({ success: true });
    } catch (error) {
        console.log("Error in markMessagesAsRead:", error.message);
        res.status(500).json({ error: "Internal server error" });
    }
};

export const deleteMessage = async (req, res) => {
    try {
        const myId = req.user._id;
        const { id: messageId } = req.params;

        const message = await Message.findById(messageId);
        if (!message) return res.status(404).json({ message: "Message not found" });

        // only the sender can delete their own message for everyone
        if (!message.senderId.equals(myId)) {
            return res.status(403).json({ message: "You can only delete your own messages" });
        }

        message.deleted = true;
        message.text = "";
        message.image = undefined;
        message.file = undefined;
        await message.save();

        // notify the rest of the conversation so their view updates in realtime
        await emitToConversation(message, "messageDeleted", { messageId: message._id.toString() }, myId);

        res.status(200).json(message);
    } catch (error) {
        console.log("Error in deleteMessage:", error.message);
        res.status(500).json({ error: "Internal server error" });
    }
};

export const reactToMessage = async (req, res) => {
    try {
        const myId = req.user._id;
        const { id: messageId } = req.params;
        const { emoji } = req.body;

        if (!emoji) return res.status(400).json({ message: "Emoji is required" });

        const message = await Message.findById(messageId);
        if (!message) return res.status(404).json({ message: "Message not found" });

        // only participants in the conversation can react
        if (!(await isParticipant(message, myId))) {
            return res.status(403).json({ message: "Not allowed" });
        }

        const existing = message.reactions.find((r) => r.userId.equals(myId));
        if (existing && existing.emoji === emoji) {
            // same emoji again → toggle it off
            message.reactions = message.reactions.filter((r) => !r.userId.equals(myId));
        } else if (existing) {
            // different emoji → replace this user's reaction
            existing.emoji = emoji;
        } else {
            message.reactions.push({ userId: myId, emoji });
        }

        await message.save();

        // notify the rest of the conversation in realtime
        await emitToConversation(
            message,
            "messageReaction",
            { messageId: message._id.toString(), reactions: message.reactions },
            myId
        );

        res.status(200).json(message.reactions);
    } catch (error) {
        console.log("Error in reactToMessage:", error.message);
        res.status(500).json({ error: "Internal server error" });
    }
};

export const editMessage = async (req, res) => {
    try {
        const myId = req.user._id;
        const { id: messageId } = req.params;
        const { text } = req.body;

        if (!text || !text.trim()) return res.status(400).json({ message: "Text is required" });

        const message = await Message.findById(messageId);
        if (!message) return res.status(404).json({ message: "Message not found" });
        if (!message.senderId.equals(myId)) {
            return res.status(403).json({ message: "You can only edit your own messages" });
        }
        if (message.deleted) return res.status(400).json({ message: "Cannot edit a deleted message" });

        message.text = text.trim();
        message.editedAt = new Date();
        await message.save();

        await emitToConversation(
            message,
            "messageEdited",
            {
                messageId: message._id.toString(),
                text: message.text,
                editedAt: message.editedAt,
            },
            myId
        );

        res.status(200).json(message);
    } catch (error) {
        console.log("Error in editMessage:", error.message);
        res.status(500).json({ error: "Internal server error" });
    }
};

export const getChatPartners = async (req, res) => {
    try {
        const loggedInUserId = req.user._id;

        // find all the messages where the logged-in user is either sender or receiver,
        // oldest first so the last write per partner is the most recent message
        const messages = await Message.find({
            $or: [{ senderId: loggedInUserId }, { receiverId: loggedInUserId }],
        }).sort({ createdAt: 1 });

        // build a per-partner summary: latest message + count of my unread messages
        const partnerMap = new Map();
        for (const msg of messages) {
            const partnerId =
                msg.senderId.toString() === loggedInUserId.toString()
                    ? msg.receiverId.toString()
                    : msg.senderId.toString();

            let entry = partnerMap.get(partnerId);
            if (!entry) {
                entry = { lastMessage: null, unreadCount: 0 };
                partnerMap.set(partnerId, entry);
            }
            entry.lastMessage = msg; // ascending sort => last assignment wins
            if (msg.receiverId.toString() === loggedInUserId.toString() && msg.status !== "read") {
                entry.unreadCount += 1;
            }
        }

        const chatPartnerIds = [...partnerMap.keys()];
        const partners = await User.find({ _id: { $in: chatPartnerIds } }).select("-password");

        const enriched = partners
            .map((p) => {
                const entry = partnerMap.get(p._id.toString());
                const lm = entry.lastMessage;
                return {
                    ...p.toObject(),
                    lastMessage: lm
                        ? {
                              text: lm.deleted ? "" : lm.text,
                              image: lm.deleted ? null : lm.image,
                              file: lm.deleted ? null : lm.file?.url ? { name: lm.file.name } : null,
                              deleted: lm.deleted,
                              senderId: lm.senderId,
                              createdAt: lm.createdAt,
                          }
                        : null,
                    unreadCount: entry.unreadCount,
                };
            })
            // most recent conversation first
            .sort((a, b) => {
                const ta = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : 0;
                const tb = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : 0;
                return tb - ta;
            });

        res.status(200).json(enriched);
    } catch (error) {
        console.error("Error in getChatPartners: ", error.message);
        res.status(500).json({ error: "Internal server error" });
    }
};