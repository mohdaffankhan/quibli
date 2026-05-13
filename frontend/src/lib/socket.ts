import { io, type Socket } from "socket.io-client";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (socket && socket.connected) return socket;
  if (socket) return socket;
  socket = io({
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
