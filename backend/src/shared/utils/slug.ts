import { customAlphabet } from "nanoid";

const ALPHABET =
  "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

const nano = customAlphabet(ALPHABET, 10);

export function generateSlug(): string {
  return nano();
}
