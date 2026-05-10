import CryptoJS from "crypto-js";
import type { Request, Response } from "express";
import {
  ACCESS_TOKEN_TTL_SEC,
  OIDC_STATE_TTL_SEC,
  REFRESH_TOKEN_TTL_SEC,
  env,
} from "../config/env.js";
import { UnauthorizedError } from "../errors/AppError.js";

const ACCESS_COOKIE = "at";
const REFRESH_COOKIE = "rt";
const OIDC_STATE_COOKIE = "oidc_state";
const OIDC_VERIFIER_COOKIE = "oidc_cv";
const REFRESH_PATH = "/auth";

function baseOpts() {
  return {
    httpOnly: true,
    secure: env.isProd,
    sameSite: (env.isProd ? "none" : "lax") as "none" | "lax",
  };
}

export function setAuthCookies(
  res: Response,
  tokens: { accessToken: string; refreshToken: string },
): void {
  res.cookie(ACCESS_COOKIE, tokens.accessToken, {
    ...baseOpts(),
    maxAge: ACCESS_TOKEN_TTL_SEC * 1000,
    path: "/",
  });
  res.cookie(REFRESH_COOKIE, tokens.refreshToken, {
    ...baseOpts(),
    maxAge: REFRESH_TOKEN_TTL_SEC * 1000,
    path: REFRESH_PATH,
  });
}

export function clearAuthCookies(res: Response): void {
  res.clearCookie(ACCESS_COOKIE, { ...baseOpts(), path: "/" });
  res.clearCookie(REFRESH_COOKIE, { ...baseOpts(), path: REFRESH_PATH });
}

export function readAccessCookie(req: Request): string | null {
  const c = req.cookies?.[ACCESS_COOKIE];
  return typeof c === "string" ? c : null;
}

export function readRefreshCookie(req: Request): string | null {
  const c = req.cookies?.[REFRESH_COOKIE];
  return typeof c === "string" ? c : null;
}

function sign(value: string): string {
  return CryptoJS.HmacSHA256(value, env.cookieSecret).toString(
    CryptoJS.enc.Hex,
  );
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

function pack(value: string): string {
  return `${value}.${sign(value)}`;
}

function unpack(packed: string | undefined): string | null {
  if (typeof packed !== "string") return null;
  const dot = packed.lastIndexOf(".");
  if (dot < 0) return null;
  const value = packed.slice(0, dot);
  const sig = packed.slice(dot + 1);
  if (!constantTimeEqual(sig, sign(value))) return null;
  return value;
}

export function setOidcStateCookies(
  res: Response,
  params: { state: string; codeVerifier: string },
): void {
  const opts = {
    ...baseOpts(),
    maxAge: OIDC_STATE_TTL_SEC * 1000,
    path: "/auth/sentinel",
  };
  res.cookie(OIDC_STATE_COOKIE, pack(params.state), opts);
  res.cookie(OIDC_VERIFIER_COOKIE, pack(params.codeVerifier), opts);
}

export function clearOidcStateCookies(res: Response): void {
  const opts = { ...baseOpts(), path: "/auth/sentinel" };
  res.clearCookie(OIDC_STATE_COOKIE, opts);
  res.clearCookie(OIDC_VERIFIER_COOKIE, opts);
}

export function readOidcStateCookies(req: Request): {
  state: string;
  codeVerifier: string;
} {
  const state = unpack(req.cookies?.[OIDC_STATE_COOKIE]);
  const codeVerifier = unpack(req.cookies?.[OIDC_VERIFIER_COOKIE]);
  if (!state || !codeVerifier) {
    throw new UnauthorizedError(
      "Missing or tampered OIDC state",
      "OIDC_STATE_INVALID",
    );
  }
  return { state, codeVerifier };
}
