import React from "react";
import { Navigate } from "react-router-dom";

interface ProtectedRouteProps {
  children: React.ReactNode;
  onlyAdmin?: boolean;
  onlyEmpresa?: boolean;
}

export default function ProtectedRoute({
  children,
  onlyAdmin,
  onlyEmpresa,
}: ProtectedRouteProps) {
  const token = localStorage.getItem("token");
  let usuario: any = null;

  try {
    const u = localStorage.getItem("usuario");
    if (u && u !== "undefined") usuario = JSON.parse(u);
  } catch {
    usuario = null;
  }

  if (!token) return <Navigate to="/login" replace />;

  if (onlyAdmin && usuario.role !== "admin")
    return <Navigate to="/inicio" replace />;

  if (onlyEmpresa && !(usuario.role === "admin" || usuario.role === "empresa"))
    return <Navigate to="/inicio" replace />;

  return <>{children}</>;
}