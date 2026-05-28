/**
 * authClient.ts
 *
 * バックエンドの /api/* を呼ぶ fetch ラッパー。
 * フロントエンドは Cognito を直接知らず、このクライアント経由でバックエンドとのみ通信する。
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string;

export interface LoginResponse {
  accessToken: string;
  idToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface RefreshResponse {
  accessToken: string;
  idToken: string;
  expiresIn: number;
}

export interface ProfileResponse {
  sub: string;
  username: string;
  email?: string;
  groups: string[];
  tokenExpiry: number;
  issuedAt: number;
}

class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(res.status, (body as { error?: string }).error ?? res.statusText);
  }
  return res.json() as Promise<T>;
}

/**
 * POST /api/auth/login
 */
export async function login(email: string, password: string): Promise<LoginResponse> {
  const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return handleResponse<LoginResponse>(res);
}

/**
 * POST /api/auth/refresh
 */
export async function refresh(
  refreshToken: string,
  sub: string
): Promise<RefreshResponse> {
  const res = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken, sub }),
  });
  return handleResponse<RefreshResponse>(res);
}

/**
 * POST /api/auth/logout
 */
export async function logout(accessToken: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/auth/logout`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok && res.status !== 204) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(res.status, (body as { error?: string }).error ?? res.statusText);
  }
}

/**
 * GET /api/profile
 * Bearer ヘッダーにアクセストークンを付与する
 */
export async function getProfile(accessToken: string): Promise<ProfileResponse> {
  const res = await fetch(`${API_BASE_URL}/api/profile`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return handleResponse<ProfileResponse>(res);
}

export { ApiError };
