import { io } from "socket.io-client";

// In dev the API runs on :3000; in prod it's served from the same origin.
const BASE_URL = import.meta.env.MODE === "development" ? "http://localhost:3000" : "/";

// autoConnect is disabled — we connect explicitly once the user is authenticated
// so the cookie-based handshake has a valid session.
export const socket = io(BASE_URL, {
    withCredentials: true,
    autoConnect: false,
});
