import { io, Socket } from "socket.io-client";

// Resolve the correct backend URL
// booki-back runs HTTPS-only on port 3000 — always force https for localhost
const getSocketUrl = (): string => {
  if (typeof window === "undefined") {
    return "http://localhost:3000";
  }

  const envUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

  // If testing on a mobile device or local network, automatically replace localhost with current window location hostname!
  if (envUrl.includes("localhost") || envUrl.includes("127.0.0.1")) {
    const currentHostname = window.location.hostname;
    const port = envUrl.split(":").pop()?.replace(/\D/g, "") || "3000";
    return `http://${currentHostname}:${port}`;
  }

  return envUrl;
};

const SOCKET_URL = getSocketUrl();

// Lazy-loaded Socket.IO client instance
export const socket: Socket = io(SOCKET_URL, {
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: 15,
  reconnectionDelay: 1500,
  transports: ["websocket", "polling"], // Try WebSocket first, fallback to polling
});

/**
 * Connect the Socket.IO client if it is currently disconnected
 */
export const connectSocket = () => {
  if (!socket.connected) {
    socket.connect();
    console.log("📡 Socket.IO: connecting to " + SOCKET_URL);
  }
};

/**
 * Disconnect the Socket.IO client
 */
export const disconnectSocket = () => {
  if (socket.connected) {
    socket.disconnect();
    console.log("📡 Socket.IO: disconnected.");
  }
};
