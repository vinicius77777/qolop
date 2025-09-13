// src/pages/TesteTailwind.tsx
import React from "react";

const TesteTailwind: React.FC = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="bg-white shadow-lg rounded-xl p-6 text-center">
        <h1 className="text-2xl font-bold text-blue-600">
          Tailwind funcionando 🎉
        </h1>
        <p className="mt-2 text-gray-600">
          Se você está vendo esse estilo, o Tailwind está OK ✅
        </p>
      </div>
    </div>
  );
};

export default TesteTailwind;
