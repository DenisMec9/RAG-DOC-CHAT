import "dotenv/config";
import express from "express";
import { pathToFileURL } from "url";
import chatRouter from "./api/chat.js";
import ingestRouter from "./api/ingest.js";
import { requestLogger } from "./observability/requestLogger.js";

export function createApp() {
  const app = express();

  app.use(express.json({ limit: "1mb" }));
  app.use(requestLogger);
  app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS");
    if (req.method === "OPTIONS") {
      return res.sendStatus(204);
    }
    return next();
  });

  app.use(chatRouter);
  app.use(ingestRouter);

  return app;
}

const port = Number(process.env.PORT ?? 3001);
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const app = createApp();
  app.listen(port, () => {
    console.log(`Backend listening on port ${port}`);
  });
}