import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useEffect } from "react";

import SignIn from "./pages/AuthPages/SignIn";
import SignUp from "./pages/AuthPages/SignUp";
import NotFound from "./pages/OtherPage/NotFound";
import UserProfiles from "./pages/UserProfiles";
import Calendar from "./pages/Calendar";
import Blank from "./pages/Blank";
import AppLayout from "./layout/AppLayout";
import { ScrollToTop } from "./components/common/ScrollToTop";
import Home from "./pages/Dashboard/Home";
import ProtectedRoute from "./components/ProtectedRoute";
import PqrList from "./pages/Pqrs/List";
import PqrCreate from "./pages/Pqrs/Create";

import { useAuthStore } from "@/store/authStore";

export default function App() {
  const { checkAuth, isLoading } = useAuthStore();

  // 🔐 Verificar sesión al cargar la app
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // ⏳ Mientras se valida la sesión
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <span className="text-gray-500">Cargando sesión...</span>
      </div>
    );
  }

  return (
    <Router>
      <ScrollToTop />

      <Routes>
        {/* 🔒 Rutas protegidas */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route index path="/" element={<Home />} />

            {/* PQR */}
            <Route path="/pqrs" element={<PqrList />} />
            <Route path="/pqrs/create" element={<PqrCreate />} />

            {/* Otros */}
            <Route path="/profile" element={<UserProfiles />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/blank" element={<Blank />} />
          </Route>
        </Route>

        {/* 🌐 Públicas */}
        <Route path="/signin" element={<SignIn />} />
        <Route path="/signup" element={<SignUp />} />

        {/* ❌ 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}
