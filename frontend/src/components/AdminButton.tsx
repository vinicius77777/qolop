// src/components/AdminButton.tsx
import React from "react";

interface AdminButtonProps {
  label: string;
  onClick?: () => void;
}

const AdminButton: React.FC<AdminButtonProps> = ({ label, onClick }) => {
  return (
    <button
      onClick={onClick}
      className="bg-yellow-500 text-white px-6 py-3 rounded-2xl shadow-lg hover:bg-yellow-600 transition transform hover:-translate-y-1"
    >
      {label}
    </button>
  );
};

export default AdminButton;
