import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { login as apiLogin, logout as apiLogout, refresh as apiRefresh } from "../api/authClient";

/**
 * トークンの保管について（学習用コメント）
 *
 * このサンプルでは localStorage にトークンを保存しているが、
 * 本番環境では以下のリスクを考慮する必要がある:
 *
 * - localStorage: XSS 攻撃でスクリプトがトークンを読み取れる。
 *   利点: ページリロード後もトークンが残る。タブをまたいで共有できる。
 *
 * - sessionStorage: タブを閉じると消える。XSS リスクは同様。
 *
 * - httpOnly Cookie（本番ベストプラクティス）:
 *   JS からアクセス不可なため XSS に強い。
 *   ただし CSRF 対策（SameSite=Strict/Lax、CSRF トークンなど）が別途必要。
 *   バックエンドが Cookie をセットし、クライアントは Cookie を意識しない設計にする。
 */

const TOKEN_KEY = "cognito_jwt_tokens";

interface StoredTokens {
  accessToken: string;
  idToken: string;
  refreshToken: string;
  sub: string;
  expiresAt: number; // Unix ms
}

function loadTokens(): StoredTokens | null {
  try {
    const raw = localStorage.getItem(TOKEN_KEY);
    return raw ? (JSON.parse(raw) as StoredTokens) : null;
  } catch {
    return null;
  }
}

function saveTokens(tokens: StoredTokens): void {
  localStorage.setItem(TOKEN_KEY, JSON.stringify(tokens));
}

function clearTokens(): void {
  localStorage.removeItem(TOKEN_KEY);
}

interface AuthContextValue {
  isAuthenticated: boolean;
  accessToken: string | null;
  sub: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [stored, setStored] = useState<StoredTokens | null>(loadTokens);

  const login = useCallback(async (email: string, password: string) => {
    const res = await apiLogin(email, password);
    // sub は idToken の payload に含まれる（Base64 デコードで取得）
    const sub = parseSubFromIdToken(res.idToken);
    const tokens: StoredTokens = {
      accessToken: res.accessToken,
      idToken: res.idToken,
      refreshToken: res.refreshToken,
      sub,
      expiresAt: Date.now() + res.expiresIn * 1000,
    };
    saveTokens(tokens);
    setStored(tokens);
  }, []);

  const logout = useCallback(async () => {
    if (stored?.accessToken) {
      await apiLogout(stored.accessToken).catch(console.error);
    }
    clearTokens();
    setStored(null);
  }, [stored]);

  const refreshSession = useCallback(async () => {
    if (!stored?.refreshToken || !stored?.sub) return;
    const res = await apiRefresh(stored.refreshToken, stored.sub);
    const updated: StoredTokens = {
      ...stored,
      accessToken: res.accessToken,
      idToken: res.idToken,
      expiresAt: Date.now() + res.expiresIn * 1000,
    };
    saveTokens(updated);
    setStored(updated);
  }, [stored]);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: stored !== null,
        accessToken: stored?.accessToken ?? null,
        sub: stored?.sub ?? null,
        login,
        logout,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuthContext must be used within AuthProvider");
  return ctx;
}

/**
 * idToken（JWT）の payload 部分をデコードして sub を取得する
 * 注: フロントで JWT を検証するわけではない（検証はバックエンドの責務）
 */
function parseSubFromIdToken(idToken: string): string {
  try {
    const payload = idToken.split(".")[1];
    const decoded = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/"))) as {
      sub?: string;
    };
    return decoded.sub ?? "";
  } catch {
    return "";
  }
}
