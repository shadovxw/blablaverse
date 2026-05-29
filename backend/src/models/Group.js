import mongoose from "mongoose";

const groupSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            maxlength: 100,
        },
        avatar: {
            type: String,
            default: "",
        },
        members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
        admins: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        // per-member "last read" timestamp — used to compute unread counts
        lastRead: [
            {
                userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
                at: { type: Date, default: Date.now },
                _id: false,
            },
        ],
    },
    { timestamps: true }
);

const Group = mongoose.model("Group", groupSchema);

export default Group;
