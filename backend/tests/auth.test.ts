import { eq } from "drizzle-orm";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../src/app.js";
import { db } from "../src/shared/db/index.js";
import { sessions, users } from "../src/shared/db/schema.js";
import {
  cookieHeader,
  cookieValue,
  registerUser,
  setCookieHeaderToArray,
  uniqueEmail,
} from "./helpers/auth.js";

describe("auth", () => {
  it("registers a new user and sets at+rt cookies", async () => {
    const email = uniqueEmail("alice");
    const res = await request(app).post("/auth/register").send({
      email,
      password: "password1234",
      name: "Alice",
    });
    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe(email);
    const cookies = setCookieHeaderToArray(res.headers["set-cookie"]);
    expect(cookieValue(cookies, "at")).toBeTruthy();
    expect(cookieValue(cookies, "rt")).toBeTruthy();

    const rows = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email));
    expect(rows.length).toBe(1);
  });

  it("rejects duplicate email registration with 409", async () => {
    const email = uniqueEmail("dup");
    await registerUser(app, { email });
    const res = await request(app).post("/auth/register").send({
      email,
      password: "password1234",
      name: "Other",
    });
    expect(res.status).toBe(409);
    expect(res.body.error).toBe("EMAIL_TAKEN");
  });

  it("rejects invalid email format with 400", async () => {
    const res = await request(app).post("/auth/register").send({
      email: "not-an-email",
      password: "password1234",
      name: "Bob",
    });
    expect(res.status).toBe(400);
  });

  it("rejects wrong password on login with 401", async () => {
    const u = await registerUser(app, { password: "rightpassword" });
    const res = await request(app)
      .post("/auth/login")
      .send({ email: u.email, password: "wrongpassword" });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("INVALID_CREDENTIALS");
  });

  it("returns 401 from /auth/me without cookie", async () => {
    const res = await request(app).get("/auth/me");
    expect(res.status).toBe(401);
  });

  it("returns the user from /auth/me with access cookie", async () => {
    const u = await registerUser(app);
    const res = await request(app)
      .get("/auth/me")
      .set("Cookie", cookieHeader(u));
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(u.email);
  });

  it("rotates session on /auth/refresh", async () => {
    const u = await registerUser(app);
    const res = await request(app)
      .post("/auth/refresh")
      .set("Cookie", u.refreshCookie);
    expect(res.status).toBe(200);
    const newCookies = setCookieHeaderToArray(res.headers["set-cookie"]);
    expect(cookieValue(newCookies, "at")).toBeTruthy();
    expect(cookieValue(newCookies, "rt")).toBeTruthy();

    const allSessions = await db
      .select()
      .from(sessions)
      .where(eq(sessions.userId, u.id));
    expect(allSessions.length).toBe(2);
    const revoked = allSessions.filter((s) => s.revokedAt !== null);
    const active = allSessions.filter((s) => s.revokedAt === null);
    expect(revoked.length).toBe(1);
    expect(active.length).toBe(1);
  });

  it("detects refresh-token reuse and revokes all user sessions", async () => {
    const u = await registerUser(app);
    const firstRefresh = await request(app)
      .post("/auth/refresh")
      .set("Cookie", u.refreshCookie);
    expect(firstRefresh.status).toBe(200);

    const reuse = await request(app)
      .post("/auth/refresh")
      .set("Cookie", u.refreshCookie);
    expect(reuse.status).toBe(401);
    expect(reuse.body.error).toBe("REFRESH_REUSE");

    const allSessions = await db
      .select()
      .from(sessions)
      .where(eq(sessions.userId, u.id));
    const active = allSessions.filter((s) => s.revokedAt === null);
    expect(active.length).toBe(0);
  });

  it("logs out and revokes the session", async () => {
    const u = await registerUser(app);
    const res = await request(app)
      .post("/auth/logout")
      .set("Cookie", u.refreshCookie);
    expect(res.status).toBe(204);

    const remaining = await db
      .select()
      .from(sessions)
      .where(eq(sessions.userId, u.id));
    expect(remaining.length).toBe(1);
    expect(remaining[0]!.revokedAt).not.toBeNull();
  });
});
