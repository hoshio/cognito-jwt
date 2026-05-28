import { Request, Response, NextFunction } from "express";
import { createRemoteJWKSet, jwtVerify, JWTPayload } from "jose";
import { config, TOKEN_ISSUER, JWKS_URL } from "../config";

// Cognito アクセストークンの追加クレーム
interface CognitoAccessTokenPayload extends JWTPayload {
  client_id?: string;
  token_use?: string;
  username?: string;
  "cognito:groups"?: string[];
}

// Express の Request 型を拡張して jwtPayload を追加
declare global {
  namespace Express {
    interface Request {
      jwtPayload?: CognitoAccessTokenPayload;
    }
  }
}

// createRemoteJWKSet はキャッシュ＋自動ローテーション対応
// アプリ起動時に一度だけ生成する（モジュールレベルで初期化）
const JWKS = createRemoteJWKSet(new URL(JWKS_URL));

export async function jwtMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Authorization header missing or invalid" });
    return;
  }

  const token = authHeader.slice("Bearer ".length);

  try {
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: TOKEN_ISSUER,
      // Cognito アクセストークンは "aud" クレームを持たない場合があるため
      // audience の検証は行わず client_id クレームで代替する
    });

    const cognitoPayload = payload as CognitoAccessTokenPayload;

    // client_id クレームの検証
    if (cognitoPayload.client_id !== config.cognitoClientId) {
      res.status(401).json({ error: "Invalid client_id in token" });
      return;
    }

    // token_use が "access" であることを確認（ID トークンを拒否）
    if (cognitoPayload.token_use !== "access") {
      res.status(401).json({ error: "Invalid token_use: expected access token" });
      return;
    }

    req.jwtPayload = cognitoPayload;
    next();
  } catch (err) {
    // jose が投げるエラー名でトークン問題を判別
    const errorName = (err as Error).name;
    if (
      errorName === "JWTExpired" ||
      errorName === "JWTClaimValidationFailed" ||
      errorName === "JWSSignatureVerificationFailed" ||
      errorName === "JWSInvalid"
    ) {
      res.status(401).json({ error: "Invalid or expired token" });
      return;
    }
    console.error("JWT verification error:", err);
    res.status(500).json({ error: "Internal server error during token verification" });
  }
}
