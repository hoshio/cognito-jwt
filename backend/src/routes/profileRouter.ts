import { Router, Request, Response } from "express";
import { jwtMiddleware } from "../middleware/jwtMiddleware";

export const profileRouter = Router();

/**
 * GET /api/profile
 * Header: Authorization: Bearer <accessToken>
 * Response: ユーザー情報（JWT クレームから取得）
 *
 * jwtMiddleware が検証済みペイロードを req.jwtPayload にセットする
 */
profileRouter.get("/", jwtMiddleware, (req: Request, res: Response) => {
  const payload = req.jwtPayload!;

  res.json({
    sub: payload.sub,
    username: payload.username,
    email: payload["email"] as string | undefined,
    groups: payload["cognito:groups"] ?? [],
    // トークンの有効期限（Unix タイムスタンプ）
    tokenExpiry: payload.exp,
    // 発行時刻
    issuedAt: payload.iat,
  });
});
