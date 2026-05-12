import type { NextFunction, Request, Response } from "express";
import { UnauthorizedError } from "../../shared/errors/AppError.js";
import {
  activatePoll,
  closePoll,
  createPoll,
  deletePoll,
  getAnalytics,
  getPollById,
  getResponseTimeseries,
  listMyPolls,
  publishPoll,
  updatePoll,
} from "./polls.service.js";
import {
  timeseriesQuerySchema,
  type CreatePollInput,
  type UpdatePollInput,
} from "./polls.validation.js";
import { BadRequestError } from "../../shared/errors/AppError.js";

function requireUserId(req: Request): string {
  const id = req.user?.id;
  if (!id) {
    throw new UnauthorizedError("Not authenticated", "NOT_AUTHENTICATED");
  }
  return id;
}

export async function postPoll(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = requireUserId(req);
    const poll = await createPoll(userId, req.body as CreatePollInput);
    res.status(201).json({ poll });
  } catch (err) {
    next(err);
  }
}

export async function getMyPolls(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = requireUserId(req);
    const polls = await listMyPolls(userId);
    res.json({ polls });
  } catch (err) {
    next(err);
  }
}

export async function getPoll(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = requireUserId(req);
    const poll = await getPollById(req.params.id as string, userId);
    res.json({ poll });
  } catch (err) {
    next(err);
  }
}

export async function patchPoll(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = requireUserId(req);
    const poll = await updatePoll(
      req.params.id as string,
      userId,
      req.body as UpdatePollInput,
    );
    res.json({ poll });
  } catch (err) {
    next(err);
  }
}

export async function activate(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = requireUserId(req);
    const poll = await activatePoll(req.params.id as string, userId);
    res.json({ poll });
  } catch (err) {
    next(err);
  }
}

export async function close(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = requireUserId(req);
    const poll = await closePoll(req.params.id as string, userId);
    res.json({ poll });
  } catch (err) {
    next(err);
  }
}

export async function publish(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = requireUserId(req);
    const poll = await publishPoll(req.params.id as string, userId);
    res.json({ poll });
  } catch (err) {
    next(err);
  }
}

export async function remove(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = requireUserId(req);
    await deletePoll(req.params.id as string, userId);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

export async function analytics(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = requireUserId(req);
    const data = await getAnalytics(req.params.id as string, userId);
    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function analyticsTimeseries(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = requireUserId(req);
    const parsed = timeseriesQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      throw new BadRequestError(
        "Invalid timeseries query",
        "TIMESERIES_BAD_QUERY",
      );
    }
    const data = await getResponseTimeseries(
      req.params.id as string,
      userId,
      parsed.data.granularity,
      parsed.data.window,
    );
    res.json(data);
  } catch (err) {
    next(err);
  }
}
