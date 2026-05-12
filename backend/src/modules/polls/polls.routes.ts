import { Router } from "express";
import { optionalAuth } from "../../shared/middleware/optionalAuth.js";
import { requireAuth } from "../../shared/middleware/requireAuth.js";
import { validate } from "../../shared/middleware/validate.js";
import {
  activate,
  analytics,
  analyticsTimeseries,
  close,
  getMyPolls,
  getPoll,
  patchPoll,
  postPoll,
  publish,
  remove,
} from "./polls.controller.js";
import {
  getPublicPoll,
  getPublicResults,
  respond,
} from "./polls.public.controller.js";
import {
  createPollSchema,
  respondSchema,
  updatePollSchema,
} from "./polls.validation.js";

export const pollsRouter = Router();

pollsRouter.use(requireAuth);
pollsRouter.post("/", validate(createPollSchema), postPoll);
pollsRouter.get("/", getMyPolls);
pollsRouter.get("/:id", getPoll);
pollsRouter.patch("/:id", validate(updatePollSchema), patchPoll);
pollsRouter.post("/:id/activate", activate);
pollsRouter.post("/:id/close", close);
pollsRouter.post("/:id/publish", publish);
pollsRouter.delete("/:id", remove);
pollsRouter.get("/:id/analytics", analytics);
pollsRouter.get("/:id/analytics/timeseries", analyticsTimeseries);

export const publicPollsRouter = Router();

publicPollsRouter.get("/:slug", getPublicPoll);
publicPollsRouter.post(
  "/:slug/respond",
  optionalAuth,
  validate(respondSchema),
  respond,
);
publicPollsRouter.get("/:slug/results", getPublicResults);
