import { eq } from "drizzle-orm";
import type { NextFunction, Request, Response } from "express";
import { db } from "../../shared/db/index.js";
import { polls } from "../../shared/db/schema.js";
import { AppError, NotFoundError } from "../../shared/errors/AppError.js";
import { getClientIp, hashIp } from "../../shared/utils/ip.js";
import {
  fetchQuestionsWithOptions,
  getAnalytics,
  toPollDTO,
} from "./polls.service.js";
import { submitResponse } from "./responses.service.js";
import type { RespondInput } from "./polls.validation.js";

class PollGoneError extends AppError {
  constructor(message: string) {
    super(message, 410, "POLL_NOT_AVAILABLE");
  }
}

async function fetchPollBySlug(slug: string) {
  const rows = await db
    .select()
    .from(polls)
    .where(eq(polls.slug, slug))
    .limit(1);
  return rows[0] ?? null;
}

function serializePollForPublic(poll: typeof polls.$inferSelect) {
  return {
    id: poll.id,
    title: poll.title,
    description: poll.description,
    slug: poll.slug,
    responseMode: poll.responseMode,
    status: poll.status,
    expiresAt: poll.expiresAt ? poll.expiresAt.toISOString() : null,
  };
}

export async function getPublicPoll(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const slug = req.params.slug as string;
    const poll = await fetchPollBySlug(slug);
    if (!poll || poll.status === "draft") {
      throw new NotFoundError("Poll not found", "POLL_NOT_FOUND");
    }

    const expired =
      poll.expiresAt !== null && poll.expiresAt.getTime() <= Date.now();

    if (poll.status === "published") {
      const results = await getAnalytics(poll.id, null);
      res.json({
        poll: serializePollForPublic(poll),
        status: "published",
        results,
      });
      return;
    }

    if (poll.status === "closed" || expired) {
      throw new PollGoneError(
        expired
          ? "Poll has expired. Results will be visible when the creator publishes them."
          : "Poll is closed. Results will be visible when the creator publishes them.",
      );
    }

    const qs = await fetchQuestionsWithOptions(poll.id);
    res.json({
      poll: toPollDTO(poll, qs),
      status: "active",
    });
  } catch (err) {
    next(err);
  }
}

export async function respond(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const slug = req.params.slug as string;
    const ip = getClientIp(req);
    const result = await submitResponse(slug, req.body as RespondInput, {
      user: req.user ? { id: req.user.id } : undefined,
      ipHash: hashIp(ip),
      userAgent:
        typeof req.headers["user-agent"] === "string"
          ? req.headers["user-agent"].slice(0, 500)
          : null,
    });
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

export async function getPublicResults(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const slug = req.params.slug as string;
    const poll = await fetchPollBySlug(slug);
    if (!poll) throw new NotFoundError("Poll not found", "POLL_NOT_FOUND");
    if (poll.status !== "published") {
      throw new PollGoneError("Results have not been published yet");
    }
    const results = await getAnalytics(poll.id, null);
    res.json({
      poll: serializePollForPublic(poll),
      results,
    });
  } catch (err) {
    next(err);
  }
}
