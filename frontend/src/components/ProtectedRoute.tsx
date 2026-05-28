import { Navigate } from "react-router-dom";
import { ReactNode } from "react";
import { useAuth } from "../auth/useAuth";

interface ProtectedRouteProps {
  children: ReactNode;
}

/**
 * ProtectedRoute
 *
 * 未認証ユーザーを /login へリダイレクトするラッパーコンポーネント。
 * React Router v6 の <Route element={...}> パターンで使用する。
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
