import { z } from "zod";

const optionSchema = z.object({
  label: z.string().min(1).max(200).trim(),
});

const questionSchema = z.object({
  prompt: z.string().min(1).max(500).trim(),
  isRequired: z.boolean().default(true),
  options: z.array(optionSchema).min(2).max(10),
});

const futureDate = z
  .union([z.string().datetime(), z.string().min(1)])
  .transform((s, ctx) => {
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) {
      ctx.addIssue({
        code: "custom",
        message: "Invalid date",
      });
      return z.NEVER;
    }
    return d;
  })
  .refine((d) => d.getTime() > Date.now(), {
    message: "expiresAt must be in the future",
  });

export const createPollSchema = z.object({
  title: z.string().min(1).max(200).trim(),
  description: z.string().max(2000).trim().nullish(),
  responseMode: z.enum(["anonymous", "authenticated"]),
  expiresAt: futureDate.nullish(),
  questions: z.array(questionSchema).min(1).max(50),
});

export const updatePollSchema = z.object({
  title: z.string().min(1).max(200).trim().optional(),
  description: z.string().max(2000).trim().nullish(),
  responseMode: z.enum(["anonymous", "authenticated"]).optional(),
  expiresAt: futureDate.nullish(),
  questions: z.array(questionSchema).min(1).max(50).optional(),
});

export const respondSchema = z.object({
  answers: z
    .array(
      z.object({
        questionId: z.uuid(),
        optionId: z.uuid(),
      }),
    )
    .min(1)
    .max(100),
});

export const slugParamSchema = z.object({
  slug: z.string().min(1).max(64),
});

export const idParamSchema = z.object({
  id: z.uuid(),
});

export const timeseriesQuerySchema = z.object({
  granularity: z.enum(["hour", "day"]).default("day"),
  window: z.enum(["24h", "7d", "30d"]).default("7d"),
});

export type CreatePollInput = z.infer<typeof createPollSchema>;
export type UpdatePollInput = z.infer<typeof updatePollSchema>;
export type RespondInput = z.infer<typeof respondSchema>;
export type TimeseriesQuery = z.infer<typeof timeseriesQuerySchema>;
