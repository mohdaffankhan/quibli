import type { Request, Response, NextFunction } from "express";
import { AppError } from "../errors/AppError.js";
import type z from "zod";

export function validate<T>(
  schema: z.ZodType<T>,
  target: "body" | "query" | "params" = "body",
) {
  return function (req: Request, _res: Response, next: NextFunction) {
    const result = schema.safeParse(req[target]);

    if (!result.success) {
      return next(new AppError("Invalid input", 400, "VALIDATION_ERROR"));
    }

    // Express 5 makes `req.query` and `req.params` getter-only. Defineproperty
    // around it so handlers can read the parsed/coerced object as usual.
    if (target === "body") {
      req.body = result.data;
    } else {
      Object.defineProperty(req, target, {
        value: result.data,
        writable: true,
        configurable: true,
        enumerable: true,
      });
    }
    next();
  };
}
