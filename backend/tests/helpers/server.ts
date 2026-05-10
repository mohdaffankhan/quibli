import type { AddressInfo } from "node:net";
import { createServer, type Server as HTTPServer } from "node:http";
import { app } from "../../src/app.js";
import { initIO } from "../../src/shared/realtime/io.js";

export type RunningServer = {
  http: HTTPServer;
  baseUrl: string;
  port: number;
  close: () => Promise<void>;
};

export async function startServer(): Promise<RunningServer> {
  const http = createServer(app);
  initIO(http);
  await new Promise<void>((resolve) => http.listen(0, () => resolve()));
  const port = (http.address() as AddressInfo).port;
  return {
    http,
    port,
    baseUrl: `http://127.0.0.1:${port}`,
    close: () =>
      new Promise<void>((resolve, reject) =>
        http.close((err) => (err ? reject(err) : resolve())),
      ),
  };
}
