import CryptoJS from "crypto-js";
import { randomBytes } from "node:crypto";
import { ACCESS_TOKEN_TTL_SEC, env } from "../config/env.js";
import { UnauthorizedError } from "../errors/AppError.js";

export type AccessTokenPayload = {
  sub: string;
  email: string | null;
  iat: number;
  exp: number;
};

function base64urlFromUtf8(input: string): string {
  return base64urlFromWordArray(CryptoJS.enc.Utf8.parse(input));
}

function base64urlFromWordArray(wa: CryptoJS.lib.WordArray): string {
  const b64 = CryptoJS.enc.Base64.stringify(wa);
  return b64.replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function utf8FromBase64url(input: string): string {
  const b64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
  return CryptoJS.enc.Utf8.stringify(CryptoJS.enc.Base64.parse(padded));
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

function signSegment(data: string, secret: string): string {
  return base64urlFromWordArray(CryptoJS.HmacSHA256(data, secret));
}

const HEADER = base64urlFromUtf8(JSON.stringify({ alg: "HS256", typ: "JWT" }));

export function signAccessToken(input: {
  sub: string;
  email: string | null;
}): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: AccessTokenPayload = {
    sub: input.sub,
    email: input.email,
    iat: now,
    exp: now + ACCESS_TOKEN_TTL_SEC,
  };
  const body = base64urlFromUtf8(JSON.stringify(payload));
  const signingInput = `${HEADER}.${body}`;
  const sig = signSegment(signingInput, env.jwtSecret);
  return `${signingInput}.${sig}`;
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new UnauthorizedError("Invalid token", "INVALID_TOKEN");
  }
  const [header, body, sig] = parts as [string, string, string];
  const expected = signSegment(`${header}.${body}`, env.jwtSecret);
  if (!constantTimeEqual(sig, expected)) {
    throw new UnauthorizedError("Invalid token signature", "INVALID_TOKEN");
  }
  let payload: AccessTokenPayload;
  try {
    payload = JSON.parse(utf8FromBase64url(body)) as AccessTokenPayload;
  } catch {
    throw new UnauthorizedError("Malformed token", "INVALID_TOKEN");
  }
  const now = Math.floor(Date.now() / 1000);
  if (typeof payload.exp !== "number" || payload.exp < now) {
    throw new UnauthorizedError("Token expired", "TOKEN_EXPIRED");
  }
  return payload;
}

export function generateRefreshToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashRefreshToken(token: string): string {
  return CryptoJS.SHA256(token).toString(CryptoJS.enc.Hex);
}
