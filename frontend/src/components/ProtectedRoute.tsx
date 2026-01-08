import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";

export default function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuthStore();

  // ⏳ Mientras se valida sesión
  if (isLoading) return null;

  // 🔒 No autenticado
  if (!isAuthenticated) {
    return <Navigate to="/signin" replace />;
  }

  // ✅ Autorizado
  return <Outlet />;
}
