import aj from "../lib/arcjet.js";
import { isSpoofedBot } from "@arcjet/inspect";

export const arcjetProtection = async (req, res, next) => {
    try {
        const decision = await aj.protect(req, { requested: 5 }); // Deduct 5 tokens from the bucket
        console.log("Arcjet decision:", decision);

        if (decision.isDenied()) {
            if (decision.reason.isRateLimit()) {
                return res.status(429).json({ error: "Too Many Requests" });
            } else if (decision.reason.isBot()) {
                return res.status(403).json({ error: "No bots allowed" });
            } else {
                return res.status(403).json({ error: "Forbidden" });
            }
        }

        if (decision.ip.isHosting()) {
            return res.status(403).json({ error: "Forbidden" });
        }

        if (decision.results.some(isSpoofedBot)) {
            return res.status(403).json({ error: "Forbidden" });
        }

        // Proceed to next middleware/handler
        next();
    } catch (error) {
        console.log("Arcjet Protection error:", error);
        next();
    }
};