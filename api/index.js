import "dotenv/config";
import express from "express";
import chatRouter from "../backend/dist/api/chat.js";
import ingestRouter from "../backend/dist/api/ingest.js";

const app = express();

app.use(express.json({ limit: "1mb" }));
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  return next();
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api", chatRouter);
app.use("/api", ingestRouter);

export default app;
