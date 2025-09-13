// src/components/Card.tsx
import React from "react";

interface CardProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  onClick?: () => void;
}

const Card: React.FC<CardProps> = ({ title, description, icon, onClick }) => {
  return (
    <div
      onClick={onClick}
      className="cursor-pointer bg-white p-6 rounded-2xl shadow hover:shadow-lg transition-shadow flex flex-col items-start space-y-3"
    >
      {icon && <div>{icon}</div>}
      <h3 className="text-lg font-bold text-gray-800">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
};

export default Card;
