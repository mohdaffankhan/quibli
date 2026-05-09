import dotenv from "dotenv";
import path from "path";
import { z } from "zod";

dotenv.config({ path: path.join(process.cwd(), ".env") });

const envVarsSchema = z.object({
  NODE_ENV: z
    .enum(["production", "development", "staging", "test"])
    .default("development"),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  SENTINEL_ISSUER: z.url(),
  CLIENT_ID: z.string().min(1),
  CLIENT_SECRET: z.string().min(1),
  SENTINEL_REDIRECT_URI: z.url(),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 chars"),
  COOKIE_SECRET: z.string().min(32, "COOKIE_SECRET must be at least 32 chars"),
  CORS_ORIGIN: z
    .string()
    .min(1)
    .transform((s) => s.split(",").map((o) => o.trim()).filter(Boolean)),
  IP_HASH_SALT: z.string().min(16, "IP_HASH_SALT must be at least 16 chars"),
  FRONTEND_URL: z.url().optional(),
});

const parsed = envVarsSchema.safeParse(process.env);

if (!parsed.success) {
  throw new Error(`Config validation error: ${parsed.error.message}`);
}

const data = parsed.data;

export const env = {
  nodeEnv: data.NODE_ENV,
  port: data.PORT,
  databaseUrl: data.DATABASE_URL,
  sentinel: {
    issuer: data.SENTINEL_ISSUER,
    clientId: data.CLIENT_ID,
    clientSecret: data.CLIENT_SECRET,
    redirectUri: data.SENTINEL_REDIRECT_URI,
  },
  jwtSecret: data.JWT_SECRET,
  cookieSecret: data.COOKIE_SECRET,
  corsOrigins: data.CORS_ORIGIN,
  ipHashSalt: data.IP_HASH_SALT,
  // Where the SPA lives. Used to redirect users back to the browser app after
  // server-side flows like the OIDC callback. Falls back to the first CORS
  // origin (almost always the dev front-end).
  frontendUrl: (data.FRONTEND_URL ?? data.CORS_ORIGIN[0] ?? "").replace(
    /\/+$/,
    "",
  ),
  isProd: data.NODE_ENV === "production",
} as const;

export const ACCESS_TOKEN_TTL_SEC = 15 * 60;
export const REFRESH_TOKEN_TTL_SEC = 30 * 24 * 60 * 60;
// The OIDC state/verifier cookie must outlive the *entire* round-trip to
// Sentinel — including a first-time user creating or verifying an account on
// the IdP before being redirected back. 10 min was too short for that detour
// (cookie expired -> OIDC_STATE_INVALID -> user forced to restart). 30 min
// keeps the single-use CSRF token short-lived while surviving a real sign-up.
export const OIDC_STATE_TTL_SEC = 30 * 60;

export default env;
