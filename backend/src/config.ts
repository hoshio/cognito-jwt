import "dotenv/config";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const config = {
  cognitoRegion: requireEnv("COGNITO_REGION"),
  cognitoUserPoolId: requireEnv("COGNITO_USER_POOL_ID"),
  cognitoClientId: requireEnv("COGNITO_CLIENT_ID"),
  // クライアントシークレットは省略可能
  cognitoClientSecret: process.env["COGNITO_CLIENT_SECRET"] || null,
  port: parseInt(process.env["PORT"] || "3000", 10),
  corsOrigin: process.env["CORS_ORIGIN"] || "http://localhost:5173",
} as const;

// JWT 検証用の issuer URL
export const TOKEN_ISSUER = `https://cognito-idp.${config.cognitoRegion}.amazonaws.com/${config.cognitoUserPoolId}`;

// JWKS エンドポイント
export const JWKS_URL = `${TOKEN_ISSUER}/.well-known/jwks.json`;
