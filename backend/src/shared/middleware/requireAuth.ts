import { eq } from "drizzle-orm";
import type { NextFunction, Request, Response } from "express";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import { UnauthorizedError } from "../errors/AppError.js";
import { readAccessCookie } from "../auth/cookies.js";
import { verifyAccessToken } from "../auth/tokens.js";

function readBearer(req: Request): string | null {
  const h = req.headers.authorization;
  if (typeof h !== "string") return null;
  if (!h.startsWith("Bearer ")) return null;
  return h.slice("Bearer ".length).trim() || null;
}

export async function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const token = readAccessCookie(req) ?? readBearer(req);
    if (!token) {
      throw new UnauthorizedError("Not authenticated", "NOT_AUTHENTICATED");
    }
    const payload = verifyAccessToken(token);
    const rows = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        avatarUrl: users.avatarUrl,
      })
      .from(users)
      .where(eq(users.id, payload.sub))
      .limit(1);
    const user = rows[0];
    if (!user) {
      throw new UnauthorizedError("User no longer exists", "USER_NOT_FOUND");
    }
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}
