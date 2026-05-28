import express from "express";
import { config } from "./config";
import { corsMiddleware } from "./middleware/corsMiddleware";
import { authRouter } from "./routes/authRouter";
import { profileRouter } from "./routes/profileRouter";

const app = express();

// ミドルウェアの設定
app.use(corsMiddleware);
app.use(express.json());

// ルートの設定
app.use("/api/auth", authRouter);
app.use("/api/profile", profileRouter);

// ヘルスチェック
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.listen(config.port, () => {
  console.log(`Backend server running on http://localhost:${config.port}`);
});
