import "dotenv/config";
import express from "express";
import chatRouter from "./api/chat.js";
import ingestRouter from "./api/ingest.js";

const app = express();
const port = Number(process.env.PORT ?? 3001);

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
app.use(chatRouter);
app.use(ingestRouter);

app.listen(port, () => {
  // Intentional startup log to confirm server is alive.
  console.log(`Backend listening on port ${port}`);
});
