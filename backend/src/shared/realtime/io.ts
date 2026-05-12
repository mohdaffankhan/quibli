import { parse as parseCookie } from "cookie";
import { eq } from "drizzle-orm";
import type { Server as HTTPServer } from "node:http";
import { Server, type Socket } from "socket.io";
import { verifyAccessToken } from "../auth/tokens.js";
import { env } from "../config/env.js";
import { db } from "../db/index.js";
import { polls } from "../db/schema.js";
import {
  type ClientToServerEvents,
  type ServerToClientEvents,
  type SocketData,
  pollAdminRoom,
  pollRoom,
} from "./events.js";

type AppSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  Record<string, never>,
  SocketData
>;

type AppServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  Record<string, never>,
  SocketData
>;

let io: AppServer | null = null;

export function initIO(httpServer: HTTPServer): AppServer {
  if (io) return io;
  io = new Server(httpServer, {
    cors: {
      origin: env.corsOrigins,
      credentials: true,
    },
  });

  io.use((socket, next) => {
    try {
      const cookieHeader = socket.handshake.headers.cookie ?? "";
      const cookies = parseCookie(cookieHeader);
      const at = cookies["at"];
      if (at) {
        try {
          const payload = verifyAccessToken(at);
          socket.data.userId = payload.sub;
        } catch {
          // Anonymous socket — fall through.
        }
      }
      next();
    } catch (err) {
      next(err as Error);
    }
  });

  io.on("connection", (socket: AppSocket) => {
    socket.on("poll:join", async ({ slug }, ack) => {
      try {
        const rows = await db
          .select({
            id: polls.id,
            creatorId: polls.creatorId,
            status: polls.status,
          })
          .from(polls)
          .where(eq(polls.slug, slug))
          .limit(1);
        const poll = rows[0];
        if (!poll) {
          ack?.({ ok: false, error: "POLL_NOT_FOUND" });
          return;
        }
        if (poll.status === "draft") {
          ack?.({ ok: false, error: "POLL_NOT_AVAILABLE" });
          return;
        }
        await socket.join(pollRoom(poll.id));
        if (socket.data.userId && socket.data.userId === poll.creatorId) {
          await socket.join(pollAdminRoom(poll.id));
        }
        ack?.({ ok: true, pollId: poll.id });
      } catch (err) {
        ack?.({
          ok: false,
          error: err instanceof Error ? err.message : "JOIN_FAILED",
        });
      }
    });

    socket.on("poll:leave", async ({ pollId }) => {
      await socket.leave(pollRoom(pollId));
      await socket.leave(pollAdminRoom(pollId));
    });
  });

  return io;
}

export function getIO(): AppServer {
  if (!io) {
    throw new Error("Socket.io not initialized. Call initIO(server) first.");
  }
  return io;
}
