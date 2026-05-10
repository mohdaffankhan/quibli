import { afterAll, beforeAll, beforeEach } from "vitest";
import { productionGuard, truncateAll } from "./helpers/db.js";

beforeAll(() => {
  productionGuard();
});

beforeEach(async () => {
  await truncateAll();
});

afterAll(async () => {
  await truncateAll();
});
