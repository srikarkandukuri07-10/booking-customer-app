import { io, Socket } from "socket.io-client";

// Resolve the correct backend URL
// booki-back runs HTTPS-only on port 3000 — always force https for localhost
const getSocketUrl = (): string => {
  if (typeof window === "undefined") {
    return "https://localhost:3000";
  }

  const envUrl = process.env.NEXT_PUBLIC_API_URL || "https://localhost:3000";

  // Always upgrade localhost URLs to HTTPS (booki-back is HTTPS-only)
  if (envUrl.startsWith("http://localhost") || envUrl.startsWith("http://127.0.0.1")) {
    return envUrl.replace("http://", "https://");
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
