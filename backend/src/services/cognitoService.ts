import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  InitiateAuthCommandInput,
  GlobalSignOutCommand,
  AuthFlowType,
} from "@aws-sdk/client-cognito-identity-provider";
import crypto from "crypto";
import { config } from "../config";

const cognitoClient = new CognitoIdentityProviderClient({
  region: config.cognitoRegion,
});

/**
 * SECRET_HASH の計算
 * App Client にシークレットがある場合、全 InitiateAuth 呼び出しに必要。
 * Base64(HMAC-SHA256(username + clientId, clientSecret))
 */
function computeSecretHash(username: string): string | undefined {
  if (!config.cognitoClientSecret) return undefined;
  return crypto
    .createHmac("sha256", config.cognitoClientSecret)
    .update(username + config.cognitoClientId)
    .digest("base64");
}

export interface AuthTokens {
  accessToken: string;
  idToken: string;
  refreshToken: string;
  expiresIn: number;
}

/**
 * ユーザー名＋パスワードで Cognito 認証を行う
 * USER_PASSWORD_AUTH フロー（App Client で ALLOW_USER_PASSWORD_AUTH が必要）
 */
export async function signIn(email: string, password: string): Promise<AuthTokens> {
  const authParams: Record<string, string> = {
    USERNAME: email,
    PASSWORD: password,
  };

  const secretHash = computeSecretHash(email);
  if (secretHash) {
    authParams["SECRET_HASH"] = secretHash;
  }

  const input: InitiateAuthCommandInput = {
    AuthFlow: AuthFlowType.USER_PASSWORD_AUTH,
    ClientId: config.cognitoClientId,
    AuthParameters: authParams,
  };

  const command = new InitiateAuthCommand(input);
  const response = await cognitoClient.send(command);

  // チャレンジが返された場合（NEW_PASSWORD_REQUIRED など）
  if (response.ChallengeName) {
    console.error("[Cognito] Challenge required:", response.ChallengeName);
    throw Object.assign(new Error(`Challenge required: ${response.ChallengeName}`), {
      name: "ChallengeRequiredException",
      challengeName: response.ChallengeName,
    });
  }

  const result = response.AuthenticationResult;
  if (
    !result?.AccessToken ||
    !result?.IdToken ||
    !result?.RefreshToken ||
    result?.ExpiresIn === undefined
  ) {
    throw new Error("Incomplete authentication result from Cognito");
  }

  return {
    accessToken: result.AccessToken,
    idToken: result.IdToken,
    refreshToken: result.RefreshToken,
    expiresIn: result.ExpiresIn,
  };
}

/**
 * リフレッシュトークンで新しいアクセストークンを取得する
 * REFRESH_TOKEN_AUTH フロー
 * @param refreshToken リフレッシュトークン
 * @param sub ユーザーの sub（SECRET_HASH 計算に必要）
 */
export async function refreshTokens(
  refreshToken: string,
  sub: string
): Promise<Omit<AuthTokens, "refreshToken">> {
  const authParams: Record<string, string> = {
    REFRESH_TOKEN: refreshToken,
  };

  const secretHash = computeSecretHash(sub);
  if (secretHash) {
    authParams["SECRET_HASH"] = secretHash;
  }

  const input: InitiateAuthCommandInput = {
    AuthFlow: AuthFlowType.REFRESH_TOKEN_AUTH,
    ClientId: config.cognitoClientId,
    AuthParameters: authParams,
  };

  const command = new InitiateAuthCommand(input);
  const response = await cognitoClient.send(command);

  const result = response.AuthenticationResult;
  if (
    !result?.AccessToken ||
    !result?.IdToken ||
    result?.ExpiresIn === undefined
  ) {
    throw new Error("Incomplete refresh result from Cognito");
  }

  return {
    accessToken: result.AccessToken,
    idToken: result.IdToken,
    expiresIn: result.ExpiresIn,
  };
}

/**
 * グローバルサインアウト（全デバイスのトークンを無効化）
 * @param accessToken 現在有効なアクセストークン
 */
export async function globalSignOut(accessToken: string): Promise<void> {
  const command = new GlobalSignOutCommand({ AccessToken: accessToken });
  await cognitoClient.send(command);
}

/**
 * Cognito エラーコードを HTTP ステータスコードにマッピング
 */
export function mapCognitoError(err: unknown): { status: number; message: string } {
  const name = (err as { name?: string }).name || "";
  const message = (err as Error).message || "Authentication failed";

  switch (name) {
    case "NotAuthorizedException":
      console.error("[Cognito] NotAuthorizedException:", message);
      return { status: 401, message: "Invalid email or password" };
    case "UserNotFoundException":
      return { status: 404, message: "User not found" };
    case "UserNotConfirmedException":
      return { status: 403, message: "User email not confirmed" };
    case "TooManyRequestsException":
      return { status: 429, message: "Too many requests. Please try again later" };
    case "PasswordResetRequiredException":
      return { status: 403, message: "Password reset required" };
    case "ChallengeRequiredException":
      return { status: 403, message: `Authentication challenge required: ${(err as { challengeName?: string }).challengeName}` };
    default:
      console.error("Unhandled Cognito error:", name, message);
      return { status: 500, message: "Internal server error" };
  }
}
