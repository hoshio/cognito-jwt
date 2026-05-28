import { useAuthContext } from "./AuthContext";

/**
 * useAuth フック
 *
 * コンポーネントから認証状態と操作にアクセスするための公開 API。
 * AuthContext の実装詳細を隠蔽し、シンプルなインターフェースを提供する。
 */
export function useAuth() {
  return useAuthContext();
}
