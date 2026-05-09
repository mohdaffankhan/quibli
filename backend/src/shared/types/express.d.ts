import "express";

declare global {
  namespace Express {
    interface AuthUser {
      id: string;
      email: string;
      name: string;
      avatarUrl: string | null;
    }
    interface Request {
      user?: AuthUser;
    }
  }
}

export {};
