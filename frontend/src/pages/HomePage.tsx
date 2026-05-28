import { useEffect, useState } from "react";
import { useAuth } from "../auth/useAuth";
import { getProfile, ProfileResponse, ApiError } from "../api/authClient";

export function HomePage() {
  const { accessToken, logout } = useAuth();
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    if (!accessToken) return;

    getProfile(accessToken)
      .then(setProfile)
      .catch((err) => {
        if (err instanceof ApiError) {
          setError(`API エラー (${err.status}): ${err.message}`);
        } else {
          setError("プロフィールの取得に失敗しました");
        }
      })
      .finally(() => setLoading(false));
  }, [accessToken]);

  async function handleLogout() {
    setLoggingOut(true);
    await logout().catch(console.error);
    // AuthContext が localStorage をクリアして isAuthenticated を false にする
    // → ProtectedRoute が /login へリダイレクト
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <h1 style={styles.title}>ホーム</h1>
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            style={styles.logoutButton}
          >
            {loggingOut ? "ログアウト中..." : "ログアウト"}
          </button>
        </div>

        <p style={styles.description}>
          このページは認証済みユーザーのみアクセスできます。
          <br />
          <code style={styles.code}>GET /api/profile</code> から取得したユーザー情報を表示しています。
        </p>

        {loading && <p style={styles.loading}>プロフィールを取得中...</p>}

        {error && <p style={styles.error}>{error}</p>}

        {profile && (
          <div style={styles.profileSection}>
            <h2 style={styles.sectionTitle}>ユーザー情報（JWT クレーム）</h2>
            <table style={styles.table}>
              <tbody>
                <tr>
                  <th style={styles.th}>Sub (ユーザーID)</th>
                  <td style={styles.td}>
                    <code style={styles.code}>{profile.sub}</code>
                  </td>
                </tr>
                <tr>
                  <th style={styles.th}>ユーザー名</th>
                  <td style={styles.td}>{profile.username ?? "—"}</td>
                </tr>
                <tr>
                  <th style={styles.th}>メールアドレス</th>
                  <td style={styles.td}>{profile.email ?? "—"}</td>
                </tr>
                <tr>
                  <th style={styles.th}>グループ</th>
                  <td style={styles.td}>
                    {profile.groups.length > 0
                      ? profile.groups.join(", ")
                      : "（なし）"}
                  </td>
                </tr>
                <tr>
                  <th style={styles.th}>トークン有効期限</th>
                  <td style={styles.td}>
                    {new Date(profile.tokenExpiry * 1000).toLocaleString("ja-JP")}
                  </td>
                </tr>
                <tr>
                  <th style={styles.th}>発行時刻</th>
                  <td style={styles.td}>
                    {profile.issuedAt
                      ? new Date(profile.issuedAt * 1000).toLocaleString("ja-JP")
                      : "—"}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        <div style={styles.infoBox}>
          <h3 style={styles.infoTitle}>アーキテクチャ確認ポイント</h3>
          <ul style={styles.infoList}>
            <li>フロントエンドは Cognito を直接知らない（<code style={styles.code}>/api/*</code> のみ通信）</li>
            <li>バックエンドが AWS SDK で Cognito InitiateAuth を呼んだ</li>
            <li>バックエンドが JWKS でアクセストークンを検証した</li>
            <li>ブラウザの Network タブで <code style={styles.code}>POST /api/auth/login</code> → <code style={styles.code}>GET /api/profile</code> の流れを確認できる</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: "100vh",
    backgroundColor: "#f5f5f5",
    padding: "40px 16px",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: "8px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
    padding: "40px",
    maxWidth: "700px",
    margin: "0 auto",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "16px",
  },
  title: {
    margin: 0,
    fontSize: "24px",
    fontWeight: "bold",
    color: "#1a1a1a",
  },
  logoutButton: {
    padding: "8px 16px",
    fontSize: "14px",
    fontWeight: "600",
    color: "#d32f2f",
    backgroundColor: "#fff",
    border: "1px solid #d32f2f",
    borderRadius: "4px",
    cursor: "pointer",
  },
  description: {
    color: "#555",
    lineHeight: "1.6",
    marginBottom: "24px",
  },
  loading: {
    color: "#666",
  },
  error: {
    color: "#d32f2f",
    backgroundColor: "#fdecea",
    padding: "12px",
    borderRadius: "4px",
  },
  profileSection: {
    marginBottom: "24px",
  },
  sectionTitle: {
    fontSize: "18px",
    fontWeight: "600",
    color: "#333",
    marginBottom: "12px",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
  },
  th: {
    textAlign: "left",
    padding: "10px 12px",
    backgroundColor: "#f0f4f8",
    color: "#333",
    fontWeight: "600",
    fontSize: "14px",
    width: "160px",
    border: "1px solid #e0e0e0",
  },
  td: {
    padding: "10px 12px",
    fontSize: "14px",
    color: "#333",
    border: "1px solid #e0e0e0",
    wordBreak: "break-all",
  },
  code: {
    fontFamily: "monospace",
    fontSize: "13px",
    backgroundColor: "#f5f5f5",
    padding: "1px 4px",
    borderRadius: "3px",
  },
  infoBox: {
    backgroundColor: "#e8f5e9",
    border: "1px solid #c8e6c9",
    borderRadius: "6px",
    padding: "16px 20px",
  },
  infoTitle: {
    margin: "0 0 8px",
    fontSize: "15px",
    fontWeight: "600",
    color: "#2e7d32",
  },
  infoList: {
    margin: 0,
    paddingLeft: "20px",
    color: "#1b5e20",
    lineHeight: "1.8",
    fontSize: "14px",
  },
};
