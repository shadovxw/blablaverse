import cloudinary from "../lib/cloudinary.js";
import { getReceiverSocketId, io } from "../lib/socket.js";
import Group from "../models/Group.js";
import Message from "../models/Message.js";

// Emit an event to all (online) group members, optionally excluding one user.
const emitToMembers = (members, event, payload, excludeUserId) => {
    for (const m of members) {
        const id = m._id ? m._id.toString() : m.toString();
        if (excludeUserId && id === excludeUserId.toString()) continue;
        const sid = getReceiverSocketId(id);
        if (sid) io.to(sid).emit(event, payload);
    }
};

const populateGroup = (id) =>
    Group.findById(id).populate("members", "-password").populate("admins", "-password");

const isAdmin = (group, userId) => group.admins.some((a) => a.equals(userId));
const isMember = (group, userId) => group.members.some((m) => m.equals(userId));

export const createGroup = async (req, res) => {
    try {
        const myId = req.user._id;
        const { name, memberIds = [], avatar } = req.body;
        if (!name || !name.trim()) return res.status(400).json({ message: "Group name is required" });

        // unique member set, always including the creator
        const members = [...new Set([myId.toString(), ...memberIds.map(String)])];

        let avatarUrl = "";
        if (avatar) {
            const up = await cloudinary.uploader.upload(avatar);
            avatarUrl = up.secure_url;
        }

        const group = await Group.create({
            name: name.trim(),
            avatar: avatarUrl,
            members,
            admins: [myId],
            createdBy: myId,
            lastRead: members.map((id) => ({ userId: id, at: new Date() })),
        });

        const populated = await populateGroup(group._id);

        // let other members know a new group appeared
        emitToMembers(populated.members, "newGroup", populated, myId);

        res.status(201).json(populated);
    } catch (error) {
        console.log("Error in createGroup:", error.message);
        res.status(500).json({ error: "Internal server error" });
    }
};

export const getMyGroups = async (req, res) => {
    try {
        const myId = req.user._id;
        const groups = await Group.find({ members: myId })
            .populate("members", "-password")
            .populate("admins", "-password")
            .lean();

        const enriched = await Promise.all(
            groups.map(async (g) => {
                const lastMessage = await Message.findOne({ groupId: g._id })
                    .sort({ createdAt: -1 })
                    .populate("senderId", "fullName")
                    .lean();
                const myLastRead = g.lastRead?.find((r) => r.userId.toString() === myId.toString());
                const since = myLastRead?.at || new Date(0);
                const unreadCount = await Message.countDocuments({
                    groupId: g._id,
                    senderId: { $ne: myId },
                    createdAt: { $gt: since },
                });
                return {
                    ...g,
                    isGroup: true,
                    lastMessage: lastMessage
                        ? {
                              text: lastMessage.deleted ? "" : lastMessage.text,
                              image: lastMessage.deleted ? null : lastMessage.image,
                              file: lastMessage.deleted ? null : lastMessage.file?.url ? { name: lastMessage.file.name } : null,
                              deleted: lastMessage.deleted,
                              senderId: lastMessage.senderId?._id,
                              senderName: lastMessage.senderId?.fullName,
                              createdAt: lastMessage.createdAt,
                          }
                        : null,
                    unreadCount,
                };
            })
        );

        enriched.sort((a, b) => {
            const ta = (a.lastMessage ? new Date(a.lastMessage.createdAt) : new Date(a.createdAt)).getTime();
            const tb = (b.lastMessage ? new Date(b.lastMessage.createdAt) : new Date(b.createdAt)).getTime();
            return tb - ta;
        });

        res.status(200).json(enriched);
    } catch (error) {
        console.log("Error in getMyGroups:", error.message);
        res.status(500).json({ error: "Internal server error" });
    }
};

export const getGroupMessages = async (req, res) => {
    try {
        const myId = req.user._id;
        const { id: groupId } = req.params;

        const group = await Group.findById(groupId);
        if (!group) return res.status(404).json({ message: "Group not found" });
        if (!isMember(group, myId)) return res.status(403).json({ message: "Not a member" });

        const messages = await Message.find({ groupId })
            .populate("senderId", "fullName profilePic")
            .populate("replyTo", "text image senderId deleted");

        // opening the group marks it read for me
        const lr = group.lastRead.find((r) => r.userId.equals(myId));
        if (lr) lr.at = new Date();
        else group.lastRead.push({ userId: myId, at: new Date() });
        await group.save();

        res.status(200).json(messages);
    } catch (error) {
        console.log("Error in getGroupMessages:", error.message);
        res.status(500).json({ error: "Internal server error" });
    }
};

export const sendGroupMessage = async (req, res) => {
    try {
        const myId = req.user._id;
        const { id: groupId } = req.params;
        const { text, image, file, replyTo } = req.body;

        if (!text && !image && !file) {
            return res.status(400).json({ message: "Message content is required" });
        }

        const group = await Group.findById(groupId);
        if (!group) return res.status(404).json({ message: "Group not found" });
        if (!isMember(group, myId)) return res.status(403).json({ message: "Not a member" });

        let imageUrl;
        if (image) {
            const up = await cloudinary.uploader.upload(image);
            imageUrl = up.secure_url;
        }
        let fileData;
        if (file?.data) {
            const up = await cloudinary.uploader.upload(file.data, { resource_type: "auto" });
            fileData = { url: up.secure_url, name: file.name, mimetype: file.mimetype, size: file.size };
        }

        const newMessage = new Message({
            senderId: myId,
            groupId,
            text,
            image: imageUrl,
            file: fileData,
            replyTo: replyTo || null,
            status: "sent",
        });
        await newMessage.save();
        await newMessage.populate("senderId", "fullName profilePic");
        await newMessage.populate("replyTo", "text image senderId deleted");

        emitToMembers(group.members, "newMessage", newMessage, myId);

        res.status(201).json(newMessage);
    } catch (error) {
        console.log("Error in sendGroupMessage:", error.message);
        res.status(500).json({ error: "Internal server error" });
    }
};

export const markGroupRead = async (req, res) => {
    try {
        const myId = req.user._id;
        const { id: groupId } = req.params;
        const group = await Group.findById(groupId);
        if (!group) return res.status(404).json({ message: "Group not found" });
        if (!isMember(group, myId)) return res.status(403).json({ message: "Not a member" });

        const lr = group.lastRead.find((r) => r.userId.equals(myId));
        if (lr) lr.at = new Date();
        else group.lastRead.push({ userId: myId, at: new Date() });
        await group.save();

        res.status(200).json({ success: true });
    } catch (error) {
        console.log("Error in markGroupRead:", error.message);
        res.status(500).json({ error: "Internal server error" });
    }
};

export const updateGroup = async (req, res) => {
    try {
        const myId = req.user._id;
        const { id: groupId } = req.params;
        const { name, avatar } = req.body;

        const group = await Group.findById(groupId);
        if (!group) return res.status(404).json({ message: "Group not found" });
        if (!isAdmin(group, myId)) return res.status(403).json({ message: "Admins only" });

        if (name && name.trim()) group.name = name.trim();
        if (avatar) {
            const up = await cloudinary.uploader.upload(avatar);
            group.avatar = up.secure_url;
        }
        await group.save();

        const populated = await populateGroup(group._id);
        emitToMembers(populated.members, "groupUpdated", populated);
        res.status(200).json(populated);
    } catch (error) {
        console.log("Error in updateGroup:", error.message);
        res.status(500).json({ error: "Internal server error" });
    }
};

export const addMembers = async (req, res) => {
    try {
        const myId = req.user._id;
        const { id: groupId } = req.params;
        const { memberIds = [] } = req.body;

        const group = await Group.findById(groupId);
        if (!group) return res.status(404).json({ message: "Group not found" });
        if (!isAdmin(group, myId)) return res.status(403).json({ message: "Admins only" });

        const before = new Set(group.members.map(String));
        for (const id of memberIds) {
            if (!before.has(String(id))) {
                group.members.push(id);
                group.lastRead.push({ userId: id, at: new Date() });
            }
        }
        await group.save();

        const populated = await populateGroup(group._id);
        // existing members get an update; new members get a "newGroup"
        emitToMembers(populated.members, "groupUpdated", populated);
        for (const id of memberIds) {
            if (!before.has(String(id))) {
                const sid = getReceiverSocketId(String(id));
                if (sid) io.to(sid).emit("newGroup", populated);
            }
        }
        res.status(200).json(populated);
    } catch (error) {
        console.log("Error in addMembers:", error.message);
        res.status(500).json({ error: "Internal server error" });
    }
};

export const removeMember = async (req, res) => {
    try {
        const myId = req.user._id;
        const { id: groupId, userId } = req.params;

        const group = await Group.findById(groupId);
        if (!group) return res.status(404).json({ message: "Group not found" });
        if (!isAdmin(group, myId)) return res.status(403).json({ message: "Admins only" });

        const removedSocketId = getReceiverSocketId(String(userId));
        group.members = group.members.filter((m) => !m.equals(userId));
        group.admins = group.admins.filter((a) => !a.equals(userId));
        group.lastRead = group.lastRead.filter((r) => !r.userId.equals(userId));
        await group.save();

        const populated = await populateGroup(group._id);
        emitToMembers(populated.members, "groupUpdated", populated);
        if (removedSocketId) io.to(removedSocketId).emit("removedFromGroup", { groupId });
        res.status(200).json(populated);
    } catch (error) {
        console.log("Error in removeMember:", error.message);
        res.status(500).json({ error: "Internal server error" });
    }
};

export const leaveGroup = async (req, res) => {
    try {
        const myId = req.user._id;
        const { id: groupId } = req.params;

        const group = await Group.findById(groupId);
        if (!group) return res.status(404).json({ message: "Group not found" });
        if (!isMember(group, myId)) return res.status(403).json({ message: "Not a member" });

        group.members = group.members.filter((m) => !m.equals(myId));
        group.admins = group.admins.filter((a) => !a.equals(myId));
        group.lastRead = group.lastRead.filter((r) => !r.userId.equals(myId));

        // if no members remain, delete the group entirely
        if (group.members.length === 0) {
            await Group.findByIdAndDelete(groupId);
            await Message.deleteMany({ groupId });
            return res.status(200).json({ deleted: true, groupId });
        }
        // ensure at least one admin remains
        if (group.admins.length === 0) group.admins.push(group.members[0]);
        await group.save();

        const populated = await populateGroup(group._id);
        emitToMembers(populated.members, "groupUpdated", populated);
        res.status(200).json({ left: true, groupId });
    } catch (error) {
        console.log("Error in leaveGroup:", error.message);
        res.status(500).json({ error: "Internal server error" });
    }
};

export const setAdmin = async (req, res) => {
    try {
        const myId = req.user._id;
        const { id: groupId, userId } = req.params;
        const { makeAdmin } = req.body;

        const group = await Group.findById(groupId);
        if (!group) return res.status(404).json({ message: "Group not found" });
        if (!isAdmin(group, myId)) return res.status(403).json({ message: "Admins only" });
        if (!isMember(group, userId)) return res.status(400).json({ message: "User is not a member" });

        if (makeAdmin) {
            if (!group.admins.some((a) => a.equals(userId))) group.admins.push(userId);
        } else {
            // don't allow removing the last admin
            if (group.admins.length <= 1) {
                return res.status(400).json({ message: "Group must have at least one admin" });
            }
            group.admins = group.admins.filter((a) => !a.equals(userId));
        }
        await group.save();

        const populated = await populateGroup(group._id);
        emitToMembers(populated.members, "groupUpdated", populated);
        res.status(200).json(populated);
    } catch (error) {
        console.log("Error in setAdmin:", error.message);
        res.status(500).json({ error: "Internal server error" });
    }
};
