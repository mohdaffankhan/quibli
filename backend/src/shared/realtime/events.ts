import type { Poll } from "../db/schema.js";

export type PollStatus = Poll["status"];

export type ServerToClientEvents = {
  "response:created": (payload: {
    pollId: string;
    totalResponses: number;
  }) => void;
  "analytics:update": (payload: {
    pollId: string;
    perQuestion: Array<{
      questionId: string;
      options: Array<{ optionId: string; count: number }>;
    }>;
  }) => void;
  "poll:status": (payload: { pollId: string; status: PollStatus }) => void;
};

export type ClientToServerEvents = {
  "poll:join": (
    payload: { slug: string },
    ack: (resp: { ok: boolean; pollId?: string; error?: string }) => void,
  ) => void;
  "poll:leave": (payload: { pollId: string }) => void;
};

export type SocketData = {
  userId?: string;
};

export function pollRoom(pollId: string): string {
  return `poll:${pollId}`;
}

export function pollAdminRoom(pollId: string): string {
  return `poll-admin:${pollId}`;
}
