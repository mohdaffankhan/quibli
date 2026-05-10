import { SentinelClient } from "@sentinel-oidc/sdk";
import { env } from "../config/env.js";

export const sentinelClient = new SentinelClient({
  issuer: env.sentinel.issuer,
  clientId: env.sentinel.clientId,
  clientSecret: env.sentinel.clientSecret,
  redirectUri: env.sentinel.redirectUri,
  scopes: ["openid", "profile", "email"],
});
