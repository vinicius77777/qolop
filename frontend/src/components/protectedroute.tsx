import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import type { Usuario } from "../services/types";

interface ProtectedRouteProps {
  children: React.ReactNode;
  onlyAdmin?: boolean;
  onlyEmpresa?: boolean;
}

function hasRequiredAccess(
  usuario: Usuario | null,
  onlyAdmin?: boolean,
  onlyEmpresa?: boolean
) {
  const role = usuario?.role;

  if (onlyAdmin) {
    return role === "admin";
  }

  if (onlyEmpresa) {
    return role === "admin" || role === "empresa";
  }

  return true;
}

export default function ProtectedRoute({
  children,
  onlyAdmin,
  onlyEmpresa,
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return null;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!hasRequiredAccess(user, onlyAdmin, onlyEmpresa)) {
    return <Navigate to="/inicio" replace />;
  }

  return <>{children}</>;
}