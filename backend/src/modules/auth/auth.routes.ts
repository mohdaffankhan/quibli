import { Router } from "express";
import { requireAuth } from "../../shared/middleware/requireAuth.js";
import { validate } from "../../shared/middleware/validate.js";
import {
  login,
  logoutHandler,
  me,
  refresh,
  register,
  sentinelCallback,
  sentinelLogin,
} from "./auth.controller.js";
import {
  loginSchema,
  registerSchema,
  sentinelCallbackSchema,
} from "./auth.validation.js";

export const authRouter = Router();

authRouter.post("/register", validate(registerSchema), register);
authRouter.post("/login", validate(loginSchema), login);
authRouter.post("/refresh", refresh);
authRouter.post("/logout", logoutHandler);
authRouter.get("/me", requireAuth, me);

authRouter.get("/sentinel/login", sentinelLogin);
authRouter.get(
  "/sentinel/callback",
  validate(sentinelCallbackSchema, "query"),
  sentinelCallback,
);
