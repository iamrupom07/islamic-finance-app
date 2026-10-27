import "dotenv/config";
import { createApp } from "./app.js";
const { app, ctx } = await createApp();
let stopping = false;
for (const signal of ["SIGTERM", "SIGINT"])
  process.on(signal, () => {
    if (stopping) return;
    stopping = true;
    void app
      .close()
      .then(() => {
        process.exitCode = 0;
      })
      .catch(() => {
        process.exitCode = 1;
      });
  });
try {
  await app.listen({ port: ctx.env.PORT, host: "0.0.0.0" });
} catch {
  app.log.error({ code: "STARTUP_FAILED" }, "Unable to start");
  await app.close();
  process.exitCode = 1;
}
