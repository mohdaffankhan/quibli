import { z } from "zod";

export const registerSchema = z.object({
  email: z.email().toLowerCase().trim(),
  password: z.string().min(8).max(200),
  name: z.string().min(1).max(120).trim(),
});

export const loginSchema = z.object({
  email: z.email().toLowerCase().trim(),
  password: z.string().min(1).max(200),
});

export const sentinelCallbackSchema = z.object({
  code: z.string().min(1),
  state: z.string().min(1),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type SentinelCallbackInput = z.infer<typeof sentinelCallbackSchema>;
