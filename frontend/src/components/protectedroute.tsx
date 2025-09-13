// src/components/ProtectedRoute.tsx
import React from "react";
import { Navigate } from "react-router-dom";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const token = localStorage.getItem("token");

  if (!token) {
    // se não tiver token, manda pro login
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
