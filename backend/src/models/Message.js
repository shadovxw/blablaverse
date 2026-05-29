import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
    senderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    receiverId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,        
    },
    text : {
        type: String,
        trim: true,
        maxlength: 2000,
    },
    image: {
        type: String,
    },
    file: {
        url: { type: String },
        name: { type: String },
        mimetype: { type: String },
        size: { type: Number },
    },
    status: {
        type: String,
        enum: ["sent", "delivered", "read"],
        default: "sent",
    },
    deleted: {
        type: Boolean,
        default: false,
    },
    replyTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Messages",
        default: null,
    },
    reactions: [
        {
            userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
            emoji: { type: String, required: true },
            _id: false,
        },
    ],
    editedAt: {
        type: Date,
        default: null,
    },
    linkPreview: {
        url: { type: String },
        title: { type: String },
        description: { type: String },
        image: { type: String },
        siteName: { type: String },
    },
    }, {timestamps: true}
);

const Message = mongoose.model("Messages", messageSchema);

export default Message;