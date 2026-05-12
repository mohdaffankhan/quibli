import { and, asc, count, countDistinct, eq, gte, inArray, sql } from "drizzle-orm";
import { db } from "../../shared/db/index.js";
import {
  answers,
  options,
  polls,
  questions,
  responses,
} from "../../shared/db/schema.js";
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from "../../shared/errors/AppError.js";
import { getIO } from "../../shared/realtime/io.js";
import { pollAdminRoom, pollRoom } from "../../shared/realtime/events.js";
import { generateSlug } from "../../shared/utils/slug.js";
import type {
  Analytics,
  AnalyticsQuestion,
  PollDTO,
  PollStatus,
  PollSummaryDTO,
  QuestionDTO,
} from "./polls.types.js";
import type {
  CreatePollInput,
  UpdatePollInput,
} from "./polls.validation.js";

const MAX_SLUG_ATTEMPTS = 5;

async function uniqueSlug(): Promise<string> {
  for (let i = 0; i < MAX_SLUG_ATTEMPTS; i++) {
    const candidate = generateSlug();
    const existing = await db
      .select({ id: polls.id })
      .from(polls)
      .where(eq(polls.slug, candidate))
      .limit(1);
    if (existing.length === 0) return candidate;
  }
  throw new Error("Could not generate a unique slug");
}

function ensureOwner(poll: { creatorId: string }, requesterId: string): void {
  if (poll.creatorId !== requesterId) {
    throw new ForbiddenError("Not your poll", "NOT_POLL_OWNER");
  }
}

async function loadPollOrThrow(pollId: string) {
  const rows = await db
    .select()
    .from(polls)
    .where(eq(polls.id, pollId))
    .limit(1);
  const poll = rows[0];
  if (!poll) throw new NotFoundError("Poll not found", "POLL_NOT_FOUND");
  return poll;
}

export async function fetchQuestionsWithOptions(
  pollId: string,
): Promise<QuestionDTO[]> {
  const qs = await db
    .select()
    .from(questions)
    .where(eq(questions.pollId, pollId))
    .orderBy(asc(questions.orderIndex));
  if (qs.length === 0) return [];
  const opts = await db
    .select()
    .from(options)
    .where(
      inArray(
        options.questionId,
        qs.map((q) => q.id),
      ),
    )
    .orderBy(asc(options.orderIndex));
  const byQ = new Map<string, QuestionDTO>();
  for (const q of qs) {
    byQ.set(q.id, {
      id: q.id,
      prompt: q.prompt,
      isRequired: q.isRequired,
      orderIndex: q.orderIndex,
      options: [],
    });
  }
  for (const o of opts) {
    const q = byQ.get(o.questionId);
    if (q)
      q.options.push({
        id: o.id,
        label: o.label,
        orderIndex: o.orderIndex,
      });
  }
  return Array.from(byQ.values());
}

export function toPollDTO(
  poll: typeof polls.$inferSelect,
  qs: QuestionDTO[],
): PollDTO {
  return {
    id: poll.id,
    title: poll.title,
    description: poll.description,
    slug: poll.slug,
    responseMode: poll.responseMode,
    status: poll.status,
    expiresAt: poll.expiresAt ? poll.expiresAt.toISOString() : null,
    createdAt: poll.createdAt.toISOString(),
    updatedAt: poll.updatedAt.toISOString(),
    questions: qs,
  };
}

async function insertQuestionsAndOptions(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  pollId: string,
  input: CreatePollInput["questions"],
): Promise<void> {
  for (let qi = 0; qi < input.length; qi++) {
    const q = input[qi]!;
    const [inserted] = await tx
      .insert(questions)
      .values({
        pollId,
        prompt: q.prompt,
        isRequired: q.isRequired ?? true,
        orderIndex: qi,
      })
      .returning({ id: questions.id });
    if (!inserted) throw new Error("Failed to insert question");
    const optionValues = q.options.map((o, oi) => ({
      questionId: inserted.id,
      label: o.label,
      orderIndex: oi,
    }));
    if (optionValues.length > 0) {
      await tx.insert(options).values(optionValues);
    }
  }
}

export async function createPoll(
  creatorId: string,
  input: CreatePollInput,
): Promise<PollDTO> {
  const slug = await uniqueSlug();
  return await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(polls)
      .values({
        creatorId,
        title: input.title,
        description: input.description ?? null,
        slug,
        responseMode: input.responseMode,
        expiresAt: input.expiresAt ?? null,
      })
      .returning();
    if (!created) throw new Error("Failed to create poll");
    await insertQuestionsAndOptions(tx, created.id, input.questions);
    const qs = await fetchQuestionsWithOptionsTx(tx, created.id);
    return toPollDTO(created, qs);
  });
}

async function fetchQuestionsWithOptionsTx(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  pollId: string,
): Promise<QuestionDTO[]> {
  const qs = await tx
    .select()
    .from(questions)
    .where(eq(questions.pollId, pollId))
    .orderBy(asc(questions.orderIndex));
  if (qs.length === 0) return [];
  const opts = await tx
    .select()
    .from(options)
    .where(
      inArray(
        options.questionId,
        qs.map((q) => q.id),
      ),
    )
    .orderBy(asc(options.orderIndex));
  const byQ = new Map<string, QuestionDTO>();
  for (const q of qs) {
    byQ.set(q.id, {
      id: q.id,
      prompt: q.prompt,
      isRequired: q.isRequired,
      orderIndex: q.orderIndex,
      options: [],
    });
  }
  for (const o of opts) {
    const q = byQ.get(o.questionId);
    if (q)
      q.options.push({
        id: o.id,
        label: o.label,
        orderIndex: o.orderIndex,
      });
  }
  return Array.from(byQ.values());
}

export async function listMyPolls(
  creatorId: string,
): Promise<PollSummaryDTO[]> {
  const rows = await db
    .select({
      id: polls.id,
      title: polls.title,
      slug: polls.slug,
      status: polls.status,
      responseMode: polls.responseMode,
      expiresAt: polls.expiresAt,
      createdAt: polls.createdAt,
      totalResponses: count(responses.id).as("total_responses"),
    })
    .from(polls)
    .leftJoin(responses, eq(responses.pollId, polls.id))
    .where(eq(polls.creatorId, creatorId))
    .groupBy(polls.id);
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    slug: r.slug,
    status: r.status,
    responseMode: r.responseMode,
    expiresAt: r.expiresAt ? r.expiresAt.toISOString() : null,
    createdAt: r.createdAt.toISOString(),
    totalResponses: Number(r.totalResponses),
  }));
}

export async function getPollById(
  pollId: string,
  requesterId: string,
): Promise<PollDTO> {
  const poll = await loadPollOrThrow(pollId);
  ensureOwner(poll, requesterId);
  const qs = await fetchQuestionsWithOptions(poll.id);
  return toPollDTO(poll, qs);
}

export async function updatePoll(
  pollId: string,
  requesterId: string,
  input: UpdatePollInput,
): Promise<PollDTO> {
  const poll = await loadPollOrThrow(pollId);
  ensureOwner(poll, requesterId);
  if (poll.status !== "draft") {
    throw new ConflictError(
      "Only draft polls can be edited",
      "POLL_NOT_DRAFT",
    );
  }

  return await db.transaction(async (tx) => {
    await tx
      .update(polls)
      .set({
        title: input.title ?? poll.title,
        description:
          input.description === undefined
            ? poll.description
            : (input.description ?? null),
        responseMode: input.responseMode ?? poll.responseMode,
        expiresAt:
          input.expiresAt === undefined
            ? poll.expiresAt
            : (input.expiresAt ?? null),
        updatedAt: new Date(),
      })
      .where(eq(polls.id, pollId));

    if (input.questions) {
      await tx.delete(questions).where(eq(questions.pollId, pollId));
      await insertQuestionsAndOptions(tx, pollId, input.questions);
    }

    const [updated] = await tx
      .select()
      .from(polls)
      .where(eq(polls.id, pollId))
      .limit(1);
    if (!updated) throw new Error("Poll vanished after update");
    const qs = await fetchQuestionsWithOptionsTx(tx, pollId);
    return toPollDTO(updated, qs);
  });
}

async function transitionStatus(
  pollId: string,
  requesterId: string,
  from: PollStatus,
  to: PollStatus,
): Promise<PollDTO> {
  const poll = await loadPollOrThrow(pollId);
  ensureOwner(poll, requesterId);
  if (poll.status !== from) {
    throw new ConflictError(
      `Cannot transition from ${poll.status} to ${to}`,
      "ILLEGAL_STATUS_TRANSITION",
    );
  }
  if (to === "active") {
    const qs = await fetchQuestionsWithOptions(poll.id);
    if (qs.length === 0) {
      throw new BadRequestError(
        "Poll must have at least one question to activate",
        "POLL_NO_QUESTIONS",
      );
    }
    for (const q of qs) {
      if (q.options.length < 2) {
        throw new BadRequestError(
          "Each question must have at least 2 options",
          "QUESTION_FEW_OPTIONS",
        );
      }
    }
  }
  await db
    .update(polls)
    .set({ status: to, updatedAt: new Date() })
    .where(eq(polls.id, pollId));

  try {
    getIO().to(pollRoom(pollId)).emit("poll:status", { pollId, status: to });
    getIO()
      .to(pollAdminRoom(pollId))
      .emit("poll:status", { pollId, status: to });
  } catch {
    // realtime not initialized (e.g. tests) — ignore
  }

  return getPollById(pollId, requesterId);
}

export const activatePoll = (id: string, by: string) =>
  transitionStatus(id, by, "draft", "active");
export const closePoll = (id: string, by: string) =>
  transitionStatus(id, by, "active", "closed");
export const publishPoll = (id: string, by: string) =>
  transitionStatus(id, by, "closed", "published");

export async function deletePoll(
  pollId: string,
  requesterId: string,
): Promise<void> {
  const poll = await loadPollOrThrow(pollId);
  ensureOwner(poll, requesterId);
  await db.delete(polls).where(eq(polls.id, pollId));
}

export async function getAnalytics(
  pollId: string,
  requesterId: string | null,
): Promise<Analytics> {
  const poll = await loadPollOrThrow(pollId);
  if (requesterId !== null) {
    ensureOwner(poll, requesterId);
  }
  const qs = await fetchQuestionsWithOptions(pollId);

  const [totals] = await db
    .select({
      total: count(responses.id),
      authUnique: countDistinct(responses.respondentId),
    })
    .from(responses)
    .where(eq(responses.pollId, pollId));

  const grouped = await db
    .select({
      questionId: answers.questionId,
      optionId: answers.optionId,
      cnt: count(answers.id),
    })
    .from(answers)
    .innerJoin(responses, eq(responses.id, answers.responseId))
    .where(eq(responses.pollId, pollId))
    .groupBy(answers.questionId, answers.optionId);

  const byQuestion = new Map<string, Map<string, number>>();
  for (const row of grouped) {
    const inner =
      byQuestion.get(row.questionId) ?? new Map<string, number>();
    inner.set(row.optionId, Number(row.cnt));
    byQuestion.set(row.questionId, inner);
  }

  const perQuestion: AnalyticsQuestion[] = qs.map((q) => {
    const counts = byQuestion.get(q.id) ?? new Map<string, number>();
    let totalAnswers = 0;
    for (const c of counts.values()) totalAnswers += c;
    return {
      questionId: q.id,
      prompt: q.prompt,
      isRequired: q.isRequired,
      totalAnswers,
      options: q.options.map((o) => {
        const c = counts.get(o.id) ?? 0;
        return {
          optionId: o.id,
          label: o.label,
          count: c,
          pct: totalAnswers === 0 ? 0 : (c / totalAnswers) * 100,
        };
      }),
    };
  });

  return {
    pollId,
    totalResponses: Number(totals?.total ?? 0),
    uniqueAuthRespondents: Number(totals?.authUnique ?? 0),
    perQuestion,
  };
}

export type TimeseriesGranularity = "hour" | "day";
export type TimeseriesWindow = "24h" | "7d" | "30d";

export interface TimeseriesBucket {
  t: string;
  count: number;
}

export interface TimeseriesResult {
  pollId: string;
  granularity: TimeseriesGranularity;
  window: TimeseriesWindow;
  buckets: TimeseriesBucket[];
}

function windowToMs(w: TimeseriesWindow): number {
  switch (w) {
    case "24h":
      return 24 * 60 * 60 * 1000;
    case "7d":
      return 7 * 24 * 60 * 60 * 1000;
    case "30d":
      return 30 * 24 * 60 * 60 * 1000;
  }
}

function granularityToMs(g: TimeseriesGranularity): number {
  return g === "hour" ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
}

export async function getResponseTimeseries(
  pollId: string,
  requesterId: string,
  granularity: TimeseriesGranularity,
  windowKey: TimeseriesWindow,
): Promise<TimeseriesResult> {
  const poll = await loadPollOrThrow(pollId);
  ensureOwner(poll, requesterId);

  const since = new Date(Date.now() - windowToMs(windowKey));
  // granularity is validated by zod to "hour" | "day"; inline as a SQL literal
  // (not a bind parameter) so date_trunc's first arg, and the GROUP BY / ORDER BY
  // expression, are textually identical across all three positions.
  const truncLiteral = granularity === "hour" ? "hour" : "day";
  const truncExpr = sql<Date>`date_trunc('${sql.raw(truncLiteral)}', ${responses.createdAt})`;

  const rows = await db
    .select({
      bucket: truncExpr,
      cnt: count(responses.id),
    })
    .from(responses)
    .where(and(eq(responses.pollId, pollId), gte(responses.createdAt, since)))
    .groupBy(truncExpr)
    .orderBy(truncExpr);

  const counts = new Map<number, number>();
  for (const r of rows) {
    const bucket = r.bucket instanceof Date ? r.bucket : new Date(r.bucket);
    counts.set(bucket.getTime(), Number(r.cnt));
  }

  // Fill empty buckets so the chart has a continuous timeline.
  const step = granularityToMs(granularity);
  const start = Math.floor(since.getTime() / step) * step;
  const end = Math.floor(Date.now() / step) * step;

  const buckets: TimeseriesBucket[] = [];
  for (let t = start; t <= end; t += step) {
    buckets.push({
      t: new Date(t).toISOString(),
      count: counts.get(t) ?? 0,
    });
  }

  return {
    pollId,
    granularity,
    window: windowKey,
    buckets,
  };
}
