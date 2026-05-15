import { io, type Socket } from "socket.io-client";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (socket && socket.connected) return socket;
  if (socket) return socket;
  // Empty in dev → same-origin connection through the Vite proxy. In prod set
  // VITE_API_URL to the backend origin so the WS handshake hits the right host.
  const url = import.meta.env.VITE_API_URL || undefined;
  socket = io(url, {
    path: "/socket.io",
    withCredentials: true,
    autoConnect: true,
    reconnection: true,
    reconnectionDelay: 800,
    reconnectionAttempts: Infinity,
    transports: ["websocket"],
  });
  return socket;
}

export function destroySocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
