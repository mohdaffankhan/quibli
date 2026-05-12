import { eq } from "drizzle-orm";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../src/app.js";
import { db } from "../src/shared/db/index.js";
import { polls } from "../src/shared/db/schema.js";
import { cookieHeader, registerUser } from "./helpers/auth.js";
import { activatePoll, createPoll } from "./helpers/polls.js";

function answersFor(poll: { questions: Array<{ id: string; options: Array<{ id: string }> }> }) {
  return poll.questions.map((q) => ({
    questionId: q.id,
    optionId: q.options[0]!.id,
  }));
}

describe("polls — public", () => {
  it("returns 404 for a draft poll on /p/:slug", async () => {
    const u = await registerUser(app);
    const poll = await createPoll(u);
    const res = await request(app).get(`/p/${poll.slug}`);
    expect(res.status).toBe(404);
  });

  it("returns active poll with questions+options on /p/:slug", async () => {
    const u = await registerUser(app);
    const poll = await createPoll(u);
    await activatePoll(u, poll.id);
    const res = await request(app).get(`/p/${poll.slug}`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("active");
    expect(res.body.poll.questions.length).toBe(2);
    expect(res.body.poll.questions[0].options.length).toBe(2);
  });

  it("accepts an anonymous response without auth (anon poll, multiple submissions allowed)", async () => {
    const u = await registerUser(app);
    const poll = await createPoll(u, { responseMode: "anonymous" });
    await activatePoll(u, poll.id);
    const body = { answers: answersFor(poll) };
    const r1 = await request(app).post(`/p/${poll.slug}/respond`).send(body);
    expect(r1.status).toBe(201);
    const r2 = await request(app).post(`/p/${poll.slug}/respond`).send(body);
    expect(r2.status).toBe(201);
  });

  it("requires auth for an authenticated-mode poll", async () => {
    const u = await registerUser(app);
    const poll = await createPoll(u, { responseMode: "authenticated" });
    await activatePoll(u, poll.id);
    const res = await request(app)
      .post(`/p/${poll.slug}/respond`)
      .send({ answers: answersFor(poll) });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("AUTH_REQUIRED");
  });

  it("rejects a second response from the same user on an authenticated-mode poll", async () => {
    const owner = await registerUser(app);
    const voter = await registerUser(app);
    const poll = await createPoll(owner, { responseMode: "authenticated" });
    await activatePoll(owner, poll.id);
    const body = { answers: answersFor(poll) };
    const r1 = await request(app)
      .post(`/p/${poll.slug}/respond`)
      .set("Cookie", cookieHeader(voter))
      .send(body);
    expect(r1.status).toBe(201);
    const r2 = await request(app)
      .post(`/p/${poll.slug}/respond`)
      .set("Cookie", cookieHeader(voter))
      .send(body);
    expect(r2.status).toBe(409);
    expect(r2.body.error).toBe("ALREADY_RESPONDED");
  });

  it("rejects a response missing a required question", async () => {
    const u = await registerUser(app);
    const poll = await createPoll(u);
    await activatePoll(u, poll.id);
    const body = {
      answers: [
        // skip first (required) question, only answer optional Q2
        {
          questionId: poll.questions[1]!.id,
          optionId: poll.questions[1]!.options[0]!.id,
        },
      ],
    };
    const res = await request(app).post(`/p/${poll.slug}/respond`).send(body);
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("MISSING_REQUIRED");
  });

  it("rejects a response where an optionId does not belong to its questionId", async () => {
    const u = await registerUser(app);
    const poll = await createPoll(u);
    await activatePoll(u, poll.id);
    const body = {
      answers: [
        {
          questionId: poll.questions[0]!.id,
          optionId: poll.questions[1]!.options[0]!.id,
        },
        {
          questionId: poll.questions[1]!.id,
          optionId: poll.questions[1]!.options[0]!.id,
        },
      ],
    };
    const res = await request(app).post(`/p/${poll.slug}/respond`).send(body);
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("INVALID_OPTION");
  });

  it("rejects two answers for the same question", async () => {
    const u = await registerUser(app);
    const poll = await createPoll(u);
    await activatePoll(u, poll.id);
    const q = poll.questions[0]!;
    const body = {
      answers: [
        { questionId: q.id, optionId: q.options[0]!.id },
        { questionId: q.id, optionId: q.options[1]!.id },
      ],
    };
    const res = await request(app).post(`/p/${poll.slug}/respond`).send(body);
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("DUPLICATE_ANSWER");
  });

  it("returns 410 after expiry", async () => {
    const u = await registerUser(app);
    const poll = await createPoll(u);
    await activatePoll(u, poll.id);
    // Force an expiry in the past directly in the DB (validation forbids past dates via the API).
    await db
      .update(polls)
      .set({ expiresAt: new Date(Date.now() - 60_000) })
      .where(eq(polls.id, poll.id));
    const res = await request(app)
      .post(`/p/${poll.slug}/respond`)
      .send({ answers: answersFor(poll) });
    expect(res.status).toBe(410);
    expect(res.body.error).toBe("POLL_EXPIRED");
  });

  it("returns 409 when responding to a closed poll", async () => {
    const u = await registerUser(app);
    const poll = await createPoll(u);
    await activatePoll(u, poll.id);
    await request(app)
      .post(`/polls/${poll.id}/close`)
      .set("Cookie", cookieHeader(u));
    const res = await request(app)
      .post(`/p/${poll.slug}/respond`)
      .send({ answers: answersFor(poll) });
    expect(res.status).toBe(409);
    expect(res.body.error).toBe("POLL_NOT_ACCEPTING");
  });

  it("returns 410 on /results before publish, 200 after", async () => {
    const u = await registerUser(app);
    const poll = await createPoll(u);
    await activatePoll(u, poll.id);

    const before = await request(app).get(`/p/${poll.slug}/results`);
    expect(before.status).toBe(410);

    await request(app)
      .post(`/polls/${poll.id}/close`)
      .set("Cookie", cookieHeader(u));
    await request(app)
      .post(`/polls/${poll.id}/publish`)
      .set("Cookie", cookieHeader(u));

    const after = await request(app).get(`/p/${poll.slug}/results`);
    expect(after.status).toBe(200);
    expect(after.body.results.perQuestion.length).toBe(2);
  });
});
