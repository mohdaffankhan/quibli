import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../src/app.js";
import { cookieHeader, registerUser } from "./helpers/auth.js";
import { activatePoll, createPoll } from "./helpers/polls.js";

describe("analytics", () => {
  it("counts responses and computes percentages that sum to 100 per question", async () => {
    const u = await registerUser(app);
    const poll = await createPoll(u, {
      responseMode: "anonymous",
      questions: [
        {
          prompt: "Color?",
          isRequired: true,
          options: [{ label: "Red" }, { label: "Green" }, { label: "Blue" }],
        },
      ],
    });
    await activatePoll(u, poll.id);
    const q = poll.questions[0]!;
    // 3 Red, 2 Green, 0 Blue → total 5. Run in parallel to avoid serial round-trip latency.
    const reds = Array.from({ length: 3 }, () =>
      request(app)
        .post(`/p/${poll.slug}/respond`)
        .send({ answers: [{ questionId: q.id, optionId: q.options[0]!.id }] }),
    );
    const greens = Array.from({ length: 2 }, () =>
      request(app)
        .post(`/p/${poll.slug}/respond`)
        .send({ answers: [{ questionId: q.id, optionId: q.options[1]!.id }] }),
    );
    await Promise.all([...reds, ...greens]);

    const res = await request(app)
      .get(`/polls/${poll.id}/analytics`)
      .set("Cookie", cookieHeader(u));
    expect(res.status).toBe(200);
    expect(res.body.totalResponses).toBe(5);
    const pq = res.body.perQuestion[0];
    expect(pq.totalAnswers).toBe(5);
    const totalPct = pq.options.reduce(
      (acc: number, o: { pct: number }) => acc + o.pct,
      0,
    );
    expect(Math.round(totalPct)).toBe(100);

    const red = pq.options.find((o: { label: string }) => o.label === "Red");
    const green = pq.options.find(
      (o: { label: string }) => o.label === "Green",
    );
    const blue = pq.options.find((o: { label: string }) => o.label === "Blue");
    expect(red.count).toBe(3);
    expect(green.count).toBe(2);
    expect(blue.count).toBe(0);
  });

  it("timeseries returns a continuous timeline with response counts", async () => {
    const u = await registerUser(app);
    const poll = await createPoll(u, {
      responseMode: "anonymous",
      questions: [
        {
          prompt: "Pick one",
          isRequired: true,
          options: [{ label: "A" }, { label: "B" }],
        },
      ],
    });
    await activatePoll(u, poll.id);
    const q = poll.questions[0]!;

    const responsesToSend = Array.from({ length: 4 }, () =>
      request(app)
        .post(`/p/${poll.slug}/respond`)
        .send({ answers: [{ questionId: q.id, optionId: q.options[0]!.id }] }),
    );
    await Promise.all(responsesToSend);

    const res = await request(app)
      .get(`/polls/${poll.id}/analytics/timeseries?granularity=day&window=7d`)
      .set("Cookie", cookieHeader(u));
    expect(res.status).toBe(200);
    expect(res.body.granularity).toBe("day");
    expect(res.body.window).toBe("7d");
    expect(Array.isArray(res.body.buckets)).toBe(true);
    expect(res.body.buckets.length).toBeGreaterThanOrEqual(7);
    const total = res.body.buckets.reduce(
      (acc: number, b: { count: number }) => acc + b.count,
      0,
    );
    expect(total).toBe(4);
  });

  it("timeseries rejects unauthenticated callers and non-owners", async () => {
    const owner = await registerUser(app);
    const stranger = await registerUser(app);
    const poll = await createPoll(owner);
    await activatePoll(owner, poll.id);

    const noAuth = await request(app).get(
      `/polls/${poll.id}/analytics/timeseries`,
    );
    expect(noAuth.status).toBe(401);

    const wrongOwner = await request(app)
      .get(`/polls/${poll.id}/analytics/timeseries`)
      .set("Cookie", cookieHeader(stranger));
    expect(wrongOwner.status).toBe(403);
  });

  it("returns zero counts and zero percentages (no NaN) for an empty poll", async () => {
    const u = await registerUser(app);
    const poll = await createPoll(u);
    await activatePoll(u, poll.id);
    const res = await request(app)
      .get(`/polls/${poll.id}/analytics`)
      .set("Cookie", cookieHeader(u));
    expect(res.status).toBe(200);
    expect(res.body.totalResponses).toBe(0);
    for (const pq of res.body.perQuestion) {
      expect(pq.totalAnswers).toBe(0);
      for (const o of pq.options) {
        expect(o.count).toBe(0);
        expect(o.pct).toBe(0);
        expect(Number.isFinite(o.pct)).toBe(true);
      }
    }
  });
});
