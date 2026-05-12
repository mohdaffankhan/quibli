import { and, asc, count, eq, inArray } from "drizzle-orm";
import { db } from "../../shared/db/index.js";
import {
  answers,
  options,
  polls,
  questions,
  responses,
} from "../../shared/db/schema.js";
import {
  AppError,
  BadRequestError,
  ConflictError,
  NotFoundError,
  UnauthorizedError,
} from "../../shared/errors/AppError.js";
import { getIO } from "../../shared/realtime/io.js";
import { pollAdminRoom, pollRoom } from "../../shared/realtime/events.js";
import type { RespondInput } from "./polls.validation.js";

export class PollExpiredError extends AppError {
  constructor() {
    super("Poll has expired", 410, "POLL_EXPIRED");
  }
}

export class PollNotAcceptingResponsesError extends AppError {
  constructor(status: string) {
    super(
      `Poll is ${status} and is not accepting responses`,
      409,
      "POLL_NOT_ACCEPTING",
    );
  }
}

export async function submitResponse(
  slug: string,
  input: RespondInput,
  ctx: {
    user: { id: string } | undefined;
    ipHash: string | null;
    userAgent: string | null;
  },
): Promise<{ responseId: string; pollId: string }> {
  const pollRows = await db
    .select()
    .from(polls)
    .where(eq(polls.slug, slug))
    .limit(1);
  const poll = pollRows[0];
  if (!poll) throw new NotFoundError("Poll not found", "POLL_NOT_FOUND");

  if (poll.status !== "active") {
    throw new PollNotAcceptingResponsesError(poll.status);
  }
  if (poll.expiresAt && poll.expiresAt.getTime() <= Date.now()) {
    throw new PollExpiredError();
  }

  if (poll.responseMode === "authenticated" && !ctx.user) {
    throw new UnauthorizedError(
      "Login required to respond to this poll",
      "AUTH_REQUIRED",
    );
  }

  const qs = await db
    .select()
    .from(questions)
    .where(eq(questions.pollId, poll.id))
    .orderBy(asc(questions.orderIndex));
  if (qs.length === 0) {
    throw new ConflictError("Poll has no questions", "POLL_EMPTY");
  }
  const qsById = new Map(qs.map((q) => [q.id, q]));

  const opts = await db
    .select()
    .from(options)
    .where(
      inArray(
        options.questionId,
        qs.map((q) => q.id),
      ),
    );
  const optionToQuestion = new Map(opts.map((o) => [o.id, o.questionId]));

  const answeredQuestions = new Set<string>();
  for (const a of input.answers) {
    if (!qsById.has(a.questionId)) {
      throw new BadRequestError(
        `Unknown question ${a.questionId}`,
        "UNKNOWN_QUESTION",
      );
    }
    if (optionToQuestion.get(a.optionId) !== a.questionId) {
      throw new BadRequestError(
        `Option ${a.optionId} does not belong to question ${a.questionId}`,
        "INVALID_OPTION",
      );
    }
    if (answeredQuestions.has(a.questionId)) {
      throw new BadRequestError(
        `Multiple answers for question ${a.questionId}`,
        "DUPLICATE_ANSWER",
      );
    }
    answeredQuestions.add(a.questionId);
  }

  for (const q of qs) {
    if (q.isRequired && !answeredQuestions.has(q.id)) {
      throw new BadRequestError(
        `Required question ${q.id} not answered`,
        "MISSING_REQUIRED",
      );
    }
  }

  if (ctx.user && poll.responseMode === "authenticated") {
    const existing = await db
      .select({ id: responses.id })
      .from(responses)
      .where(
        and(
          eq(responses.pollId, poll.id),
          eq(responses.respondentId, ctx.user.id),
        ),
      )
      .limit(1);
    if (existing.length > 0) {
      throw new ConflictError(
        "You have already responded to this poll",
        "ALREADY_RESPONDED",
      );
    }
  }

  const responseId = await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(responses)
      .values({
        pollId: poll.id,
        respondentId: ctx.user?.id ?? null,
        ipHash: ctx.ipHash,
        userAgent: ctx.userAgent,
      })
      .returning({ id: responses.id });
    if (!created) throw new Error("Failed to insert response");
    const answerRows = input.answers.map((a) => ({
      responseId: created.id,
      questionId: a.questionId,
      optionId: a.optionId,
    }));
    await tx.insert(answers).values(answerRows);
    return created.id;
  });

  await emitResponseUpdates(poll.id);

  return { responseId, pollId: poll.id };
}

async function emitResponseUpdates(pollId: string): Promise<void> {
  try {
    const io = getIO();

    const [totals] = await db
      .select({ total: count(responses.id) })
      .from(responses)
      .where(eq(responses.pollId, pollId));

    io.to(pollRoom(pollId)).emit("response:created", {
      pollId,
      totalResponses: Number(totals?.total ?? 0),
    });

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

    const byQ = new Map<
      string,
      Array<{ optionId: string; count: number }>
    >();
    for (const row of grouped) {
      const arr = byQ.get(row.questionId) ?? [];
      arr.push({ optionId: row.optionId, count: Number(row.cnt) });
      byQ.set(row.questionId, arr);
    }
    const perQuestion = Array.from(byQ.entries()).map(
      ([questionId, opts]) => ({ questionId, options: opts }),
    );

    io.to(pollAdminRoom(pollId)).emit("analytics:update", {
      pollId,
      perQuestion,
    });
  } catch {
    // realtime not initialized — fine
  }
}
