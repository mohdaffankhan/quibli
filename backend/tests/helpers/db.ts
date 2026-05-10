import { sql } from "drizzle-orm";
import { db } from "../../src/shared/db/index.js";
import { env } from "../../src/shared/config/env.js";

const TABLES = [
  "answers",
  "responses",
  "options",
  "questions",
  "polls",
  "sessions",
  "accounts",
  "users",
] as const;

export function productionGuard(): void {
  if (env.nodeEnv === "production") {
    throw new Error(
      "Refusing to run tests with NODE_ENV=production",
    );
  }
  const url = env.databaseUrl;
  const looksLikeTestDb = /supabase|localhost|127\.0\.0\.1/.test(url);
  if (!looksLikeTestDb) {
    throw new Error(
      `Refusing to run tests against unrecognized DATABASE_URL host (expected supabase/localhost)`,
    );
  }
}

export async function truncateAll(): Promise<void> {
  const list = TABLES.join(", ");
  await db.execute(
    sql.raw(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE;`),
  );
}
