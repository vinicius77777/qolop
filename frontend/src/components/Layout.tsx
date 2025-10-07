// src/components/Layout.tsx
import React from "react";

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div style={{
      width: "100%",
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      position: "relative"
    }}>
      {children}
    </div>
  );
};

export default Layout;
