import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import type { Usuario } from "../services/types";
import { canAccessEmpresaFeatures, isAdminUser } from "../utils/permissions";

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
  if (onlyAdmin) {
    return isAdminUser(usuario);
  }

  if (onlyEmpresa) {
    return canAccessEmpresaFeatures(usuario);
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
