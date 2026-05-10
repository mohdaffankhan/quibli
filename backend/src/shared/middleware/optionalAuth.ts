import { eq } from "drizzle-orm";
import type { NextFunction, Request, Response } from "express";
import { readAccessCookie } from "../auth/cookies.js";
import { verifyAccessToken } from "../auth/tokens.js";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";

function readBearer(req: Request): string | null {
  const h = req.headers.authorization;
  if (typeof h !== "string" || !h.startsWith("Bearer ")) return null;
  return h.slice("Bearer ".length).trim() || null;
}

export async function optionalAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const token = readAccessCookie(req) ?? readBearer(req);
    if (!token) {
      next();
      return;
    }
    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch {
      next();
      return;
    }
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
    if (user) req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}
