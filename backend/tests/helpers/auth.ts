import request from "supertest";
import type { Express } from "express";
import { app } from "../../src/app.js";

export type RegisteredUser = {
  id: string;
  email: string;
  name: string;
  cookies: string[];
  accessCookie: string;
  refreshCookie: string;
};

export function setCookieHeaderToArray(
  raw: string | string[] | undefined,
): string[] {
  if (!raw) return [];
  return Array.isArray(raw) ? raw : [raw];
}

export function cookieValue(setCookies: string[], name: string): string | null {
  for (const c of setCookies) {
    const match = c.match(new RegExp(`^${name}=([^;]+)`));
    if (match && match[1]) return match[1];
  }
  return null;
}

let counter = 0;
export function uniqueEmail(prefix = "user"): string {
  counter++;
  return `${prefix}+${Date.now()}-${counter}@example.com`;
}

export async function registerUser(
  appLike: Express = app,
  overrides: Partial<{ email: string; password: string; name: string }> = {},
): Promise<RegisteredUser> {
  const email = overrides.email ?? uniqueEmail();
  const password = overrides.password ?? "password1234";
  const name = overrides.name ?? "Test User";
  const res = await request(appLike).post("/auth/register").send({
    email,
    password,
    name,
  });
  if (res.status !== 201) {
    throw new Error(
      `register failed (${res.status}): ${JSON.stringify(res.body)}`,
    );
  }
  const cookies = setCookieHeaderToArray(res.headers["set-cookie"]);
  const at = cookieValue(cookies, "at") ?? "";
  const rt = cookieValue(cookies, "rt") ?? "";
  return {
    id: res.body.user.id,
    email,
    name,
    cookies,
    accessCookie: `at=${at}`,
    refreshCookie: `rt=${rt}`,
  };
}

export function cookieHeader(user: RegisteredUser): string {
  return `${user.accessCookie}; ${user.refreshCookie}`;
}
