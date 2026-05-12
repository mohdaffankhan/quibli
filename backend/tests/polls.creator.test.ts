import { eq } from "drizzle-orm";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../src/app.js";
import { db } from "../src/shared/db/index.js";
import { questions } from "../src/shared/db/schema.js";
import { cookieHeader, registerUser } from "./helpers/auth.js";
import { createPoll } from "./helpers/polls.js";

describe("polls — creator", () => {
  it("creates a draft poll with questions and options", async () => {
    const u = await registerUser(app);
    const poll = await createPoll(u);
    expect(poll.id).toBeTruthy();
    expect(poll.slug).toMatch(/^[A-Za-z0-9]{10}$/);
    expect(poll.status).toBe("draft");
    expect(poll.questions.length).toBe(2);
    expect(poll.questions[0]!.options.length).toBe(2);
  });

  it("rejects creating a poll with 0 questions", async () => {
    const u = await registerUser(app);
    const res = await request(app)
      .post("/polls")
      .set("Cookie", cookieHeader(u))
      .send({
        title: "x",
        responseMode: "anonymous",
        questions: [],
      });
    expect(res.status).toBe(400);
  });

  it("rejects a poll where a question has fewer than 2 options", async () => {
    const u = await registerUser(app);
    const res = await request(app)
      .post("/polls")
      .set("Cookie", cookieHeader(u))
      .send({
        title: "x",
        responseMode: "anonymous",
        questions: [{ prompt: "q", options: [{ label: "only" }] }],
      });
    expect(res.status).toBe(400);
  });

  it("lists only the requester's polls with totalResponses=0", async () => {
    const a = await registerUser(app);
    const b = await registerUser(app);
    await createPoll(a, { title: "A1" });
    await createPoll(a, { title: "A2" });
    await createPoll(b, { title: "B1" });
    const res = await request(app)
      .get("/polls")
      .set("Cookie", cookieHeader(a));
    expect(res.status).toBe(200);
    expect(res.body.polls.length).toBe(2);
    for (const p of res.body.polls) {
      expect(p.totalResponses).toBe(0);
    }
  });

  it("returns 403 when another user tries to GET a poll", async () => {
    const owner = await registerUser(app);
    const intruder = await registerUser(app);
    const poll = await createPoll(owner);
    const res = await request(app)
      .get(`/polls/${poll.id}`)
      .set("Cookie", cookieHeader(intruder));
    expect(res.status).toBe(403);
  });

  it("allows PATCH while draft and rejects PATCH after activate", async () => {
    const u = await registerUser(app);
    const poll = await createPoll(u);

    const ok = await request(app)
      .patch(`/polls/${poll.id}`)
      .set("Cookie", cookieHeader(u))
      .send({ title: "Renamed" });
    expect(ok.status).toBe(200);
    expect(ok.body.poll.title).toBe("Renamed");

    const activate = await request(app)
      .post(`/polls/${poll.id}/activate`)
      .set("Cookie", cookieHeader(u));
    expect(activate.status).toBe(200);

    const blocked = await request(app)
      .patch(`/polls/${poll.id}`)
      .set("Cookie", cookieHeader(u))
      .send({ title: "Again" });
    expect(blocked.status).toBe(409);
    expect(blocked.body.error).toBe("POLL_NOT_DRAFT");
  });

  it("walks the full status machine: draft → active → closed → published", async () => {
    const u = await registerUser(app);
    const poll = await createPoll(u);

    const a = await request(app)
      .post(`/polls/${poll.id}/activate`)
      .set("Cookie", cookieHeader(u));
    expect(a.status).toBe(200);
    expect(a.body.poll.status).toBe("active");

    const a2 = await request(app)
      .post(`/polls/${poll.id}/activate`)
      .set("Cookie", cookieHeader(u));
    expect(a2.status).toBe(409);

    const c = await request(app)
      .post(`/polls/${poll.id}/close`)
      .set("Cookie", cookieHeader(u));
    expect(c.status).toBe(200);
    expect(c.body.poll.status).toBe("closed");

    const p = await request(app)
      .post(`/polls/${poll.id}/publish`)
      .set("Cookie", cookieHeader(u));
    expect(p.status).toBe(200);
    expect(p.body.poll.status).toBe("published");
  });

  it("deletes a poll and cascades questions/options", async () => {
    const u = await registerUser(app);
    const poll = await createPoll(u);
    const del = await request(app)
      .delete(`/polls/${poll.id}`)
      .set("Cookie", cookieHeader(u));
    expect(del.status).toBe(204);
    const qs = await db
      .select()
      .from(questions)
      .where(eq(questions.pollId, poll.id));
    expect(qs.length).toBe(0);
  });
});
