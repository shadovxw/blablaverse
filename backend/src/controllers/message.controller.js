import cloudinary from "../lib/cloudinary.js";
import Message from "../models/Message.js";
import User from "../models/User.js";


export const getAllContacts = async (req, res) => {
    try {
        const loggedInUserID = req.user._id;
        const filteredUser = await User.find({_id: {$ne: loggedInUserID}}).select("-password");

        res.status(200).json(filteredUser)

    } catch (error) {
        console.log("Error in getAllContacts controller: ", error);
        res.status(500).json({message: "Server error"})
    }
}

export const getMessagesByUserId = async (req, res) => {
    try {
        const myId = req.user._id;
        const {id: userToChatId} = req.params

        const message = await Message.find({
            $or: [
                {senderId:myId, receiverId:userToChatId},
                {senderId:userToChatId, receiverId:myId},
            ]
        })

        res.status(200).json(message)
    } catch (error) {
        console.log("Error in getMessagesByUserId controller: ", error);
        res.status(500).json({message: "Server error"})
    }
};

export const sendMessage = async (req, res) => {

    try {
        const {text, image} = req.body;
        const {id: receiverId} = req.params;
        const senderId = req.user._id

        let imageUrl;

        if (image) {
            const uploadResponse = await cloudinary.uploader.upload(image);
            imageUrl = uploadResponse.secure_url
        }

        const newMessage = new Message({
            senderId,
            receiverId,
            text,
            image: imageUrl,
        });

        await newMessage.save()

        res.status(201).json(newMessage);
    } catch (error) {
        console.log("Error in sendMessage controller: ", error);
        res.status(500).json({message: "Server error"})
    }
};

export const getChatPartners = async (req, res) => {
    try {
        const loggedInUserID = req.user._id

        const message = await Message.find({
            $or: [
                {senderId:loggedInUserID},
                {receiverId:loggedInUserID},
            ]
        });

        const chatPartnerIds = [...new Set(message.map(msg => msg.senderId.toString() === loggedInUserID.toString() ? msg.receiverId.toString() : msg.senderId.toString()))];

        const chatPartners = await User.find({_id: {$in:chatPartnerIds}}).select("-password")

        res.status(200).json(chatPartners)
        
    } catch (error) {
        console.log("Error in getChatPartners controller: ", error);
        res.status(500).json({message: "Server error"})
    }
}
