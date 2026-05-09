import { createServer } from "node:http";
import { app } from "./app.js";
import { env } from "./shared/config/env.js";
import { initIO } from "./shared/realtime/io.js";

const server = createServer(app);
initIO(server);

server.listen(env.port, () => {
  console.log(`Server listening on http://localhost:${env.port}`);
});
