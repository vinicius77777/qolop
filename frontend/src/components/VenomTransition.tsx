import { ReactNode, useEffect } from "react";

interface VenomTransitionProps {
  target: string;
  children: ReactNode;
}

const VenomTransition: React.FC<VenomTransitionProps> = ({ target, children }) => {
  const handleClick = () => {
    const elem = document.querySelector(".venom-transition");
    if (elem) {
      elem.classList.add("active");
      setTimeout(() => {
        window.location.href = target;
      }, 1500);
    }
  };

  return (
    <>
      <div className="venom-transition"></div>
      <div onClick={handleClick}>{children}</div>
    </>
  );
};

export default VenomTransition;
