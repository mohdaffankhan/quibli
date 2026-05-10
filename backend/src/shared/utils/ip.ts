import CryptoJS from "crypto-js";
import type { Request } from "express";
import { env } from "../config/env.js";

export function getClientIp(req: Request): string | null {
  const xff = req.headers["x-forwarded-for"];
  if (typeof xff === "string" && xff.length > 0) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  return req.ip ?? null;
}

export function hashIp(ip: string | null): string | null {
  if (!ip) return null;
  return CryptoJS.HmacSHA256(ip, env.ipHashSalt).toString(CryptoJS.enc.Hex);
}
