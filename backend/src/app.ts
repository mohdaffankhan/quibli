import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { authRouter } from "./modules/auth/auth.routes.js";
import {
  pollsRouter,
  publicPollsRouter,
} from "./modules/polls/polls.routes.js";
import { env } from "./shared/config/env.js";
import { errorHandler } from "./shared/middleware/errorHandler.js";

export function createApp(): express.Express {
  const app = express();

  app.set("trust proxy", 1);

  app.use(helmet());
  app.use(express.json({ limit: "256kb" }));
  app.use(cookieParser());
  app.use(
    cors({
      origin: env.corsOrigins,
      credentials: true,
    }),
  );

  app.get("/health", (_req, res) => {
    res.json({ ok: true, env: env.nodeEnv });
  });

  if (env.isProd) {
    const authLimiter = rateLimit({
      windowMs: 60_000,
      limit: 10,
      standardHeaders: "draft-7",
      legacyHeaders: false,
    });
    app.use("/auth/login", authLimiter);
    app.use("/auth/register", authLimiter);
  }
  app.use("/auth", authRouter);
  app.use("/polls", pollsRouter);
  app.use("/p", publicPollsRouter);

  app.use(errorHandler);

  return app;
}

export const app = createApp();
