import request from "supertest";
import { io as ioClient, type Socket } from "socket.io-client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { registerUser } from "./helpers/auth.js";
import { activatePoll, createPoll } from "./helpers/polls.js";
import { startServer, type RunningServer } from "./helpers/server.js";

let server: RunningServer;

beforeAll(async () => {
  server = await startServer();
});

afterAll(async () => {
  await server.close();
});

function connectAnon(): Socket {
  return ioClient(server.baseUrl, {
    transports: ["websocket"],
    forceNew: true,
  });
}

function connectAs(at: string): Socket {
  return ioClient(server.baseUrl, {
    transports: ["websocket"],
    forceNew: true,
    extraHeaders: { Cookie: `at=${at}` },
  });
}

function waitFor<T>(socket: Socket, event: string, timeoutMs = 5000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Timed out waiting for ${event}`)),
      timeoutMs,
    );
    socket.once(event, (payload: T) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });
}

describe("realtime", () => {
  it("emits response:created on the public poll room after a response", async () => {
    const u = await registerUser();
    const poll = await createPoll(u, { responseMode: "anonymous" });
    await activatePoll(u, poll.id);

    const socket = connectAnon();
    await new Promise<void>((resolve, reject) => {
      socket.once("connect", () => resolve());
      socket.once("connect_error", reject);
    });

    const ack = await new Promise<{ ok: boolean; pollId?: string; error?: string }>(
      (resolve) =>
        socket.emit("poll:join", { slug: poll.slug }, (r: { ok: boolean }) =>
          resolve(r as { ok: boolean }),
        ),
    );
    expect(ack.ok).toBe(true);

    const promise = waitFor<{ pollId: string; totalResponses: number }>(
      socket,
      "response:created",
    );
    const q = poll.questions[0]!;
    const res = await request(server.http)
      .post(`/p/${poll.slug}/respond`)
      .send({ answers: [{ questionId: q.id, optionId: q.options[0]!.id }] });
    expect(res.status).toBe(201);

    const payload = await promise;
    expect(payload.pollId).toBe(poll.id);
    expect(payload.totalResponses).toBe(1);

    socket.disconnect();
  });

  it("emits analytics:update on poll-admin room only to the creator", async () => {
    const owner = await registerUser();
    const poll = await createPoll(owner, { responseMode: "anonymous" });
    await activatePoll(owner, poll.id);

    const atCookie = owner.accessCookie.replace(/^at=/, "");
    const socket = connectAs(atCookie);
    await new Promise<void>((resolve, reject) => {
      socket.once("connect", () => resolve());
      socket.once("connect_error", reject);
    });

    const ack = await new Promise<{ ok: boolean }>((resolve) =>
      socket.emit("poll:join", { slug: poll.slug }, (r: { ok: boolean }) =>
        resolve(r),
      ),
    );
    expect(ack.ok).toBe(true);

    const promise = waitFor<{ pollId: string; perQuestion: unknown[] }>(
      socket,
      "analytics:update",
    );
    const q = poll.questions[0]!;
    await request(server.http)
      .post(`/p/${poll.slug}/respond`)
      .send({ answers: [{ questionId: q.id, optionId: q.options[0]!.id }] });

    const payload = await promise;
    expect(payload.pollId).toBe(poll.id);
    expect(payload.perQuestion.length).toBeGreaterThan(0);

    socket.disconnect();
  });
});
