import request from "supertest";
import { app } from "../../src/app.js";
import { cookieHeader, type RegisteredUser } from "./auth.js";

export type CreatedPoll = {
  id: string;
  slug: string;
  status: string;
  responseMode: "anonymous" | "authenticated";
  questions: Array<{
    id: string;
    prompt: string;
    isRequired: boolean;
    options: Array<{ id: string; label: string }>;
  }>;
};

export async function createPoll(
  creator: RegisteredUser,
  overrides: Partial<{
    title: string;
    responseMode: "anonymous" | "authenticated";
    expiresAt: string | null;
    questions: Array<{
      prompt: string;
      isRequired?: boolean;
      options: Array<{ label: string }>;
    }>;
  }> = {},
): Promise<CreatedPoll> {
  const body = {
    title: overrides.title ?? "Test poll",
    description: "Created in tests",
    responseMode: overrides.responseMode ?? "anonymous",
    expiresAt: overrides.expiresAt,
    questions: overrides.questions ?? [
      {
        prompt: "Q1",
        isRequired: true,
        options: [{ label: "A" }, { label: "B" }],
      },
      {
        prompt: "Q2",
        isRequired: false,
        options: [{ label: "X" }, { label: "Y" }, { label: "Z" }],
      },
    ],
  };
  const res = await request(app)
    .post("/polls")
    .set("Cookie", cookieHeader(creator))
    .send(body);
  if (res.status !== 201) {
    throw new Error(
      `createPoll failed (${res.status}): ${JSON.stringify(res.body)}`,
    );
  }
  return res.body.poll as CreatedPoll;
}

export async function activatePoll(
  creator: RegisteredUser,
  pollId: string,
): Promise<void> {
  const res = await request(app)
    .post(`/polls/${pollId}/activate`)
    .set("Cookie", cookieHeader(creator));
  if (res.status !== 200) {
    throw new Error(
      `activatePoll failed (${res.status}): ${JSON.stringify(res.body)}`,
    );
  }
}
