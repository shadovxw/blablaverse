import express from "express";
import {
    createGroup,
    getMyGroups,
    getGroupMessages,
    sendGroupMessage,
    markGroupRead,
    updateGroup,
    addMembers,
    removeMember,
    leaveGroup,
    setAdmin,
} from "../controllers/group.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";
import { arcjetProtection } from "../middleware/arcjet.middleware.js";

const router = express.Router();

router.use(arcjetProtection, protectRoute);

router.post("/", createGroup);
router.get("/", getMyGroups);
router.get("/:id/messages", getGroupMessages);
router.post("/:id/messages", sendGroupMessage);
router.put("/:id/read", markGroupRead);
router.put("/:id", updateGroup);
router.post("/:id/members", addMembers);
router.delete("/:id/members/:userId", removeMember);
router.post("/:id/leave", leaveGroup);
router.put("/:id/members/:userId/admin", setAdmin);

export default router;
