import { Router, Request, Response } from "express";
import { signIn, refreshTokens, globalSignOut, mapCognitoError } from "../services/cognitoService";
import { jwtMiddleware } from "../middleware/jwtMiddleware";

export const authRouter = Router();

/**
 * POST /api/auth/login
 * Body: { email: string, password: string }
 * Response: { accessToken, idToken, refreshToken, expiresIn }
 */
authRouter.post("/login", async (req: Request, res: Response) => {
  const { email, password } = req.body as { email?: string; password?: string };

  if (!email || !password) {
    res.status(400).json({ error: "email and password are required" });
    return;
  }

  try {
    const tokens = await signIn(email, password);
    res.json(tokens);
  } catch (err) {
    const { status, message } = mapCognitoError(err);
    res.status(status).json({ error: message });
  }
});

/**
 * POST /api/auth/refresh
 * Body: { refreshToken: string, sub: string }
 * Response: { accessToken, idToken, expiresIn }
 *
 * sub は SECRET_HASH 計算に必要（クライアントシークレットがある場合）
 * 本来はセキュアな方法（httpOnly Cookie など）でリフレッシュトークンを管理すべき
 */
authRouter.post("/refresh", async (req: Request, res: Response) => {
  const { refreshToken, sub } = req.body as { refreshToken?: string; sub?: string };

  if (!refreshToken || !sub) {
    res.status(400).json({ error: "refreshToken and sub are required" });
    return;
  }

  try {
    const tokens = await refreshTokens(refreshToken, sub);
    res.json(tokens);
  } catch (err) {
    const { status, message } = mapCognitoError(err);
    res.status(status).json({ error: message });
  }
});

/**
 * POST /api/auth/logout
 * Header: Authorization: Bearer <accessToken>
 * Response: 204 No Content
 *
 * Cognito GlobalSignOut で全デバイスのトークンを無効化する
 */
authRouter.post("/logout", jwtMiddleware, async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization!;
  const accessToken = authHeader.slice("Bearer ".length);

  try {
    await globalSignOut(accessToken);
    res.status(204).send();
  } catch (err) {
    const { status, message } = mapCognitoError(err);
    res.status(status).json({ error: message });
  }
});
