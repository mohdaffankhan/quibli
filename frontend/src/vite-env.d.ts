/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Absolute origin of the backend API (e.g. https://quibli-api.onrender.com).
   * Leave empty in local dev so requests stay same-origin and go through the
   * Vite proxy (see vite.config.ts).
   */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
