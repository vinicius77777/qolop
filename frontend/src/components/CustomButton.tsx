interface CustomButtonProps {
  text: string;
}

const CustomButton: React.FC<CustomButtonProps> = ({ text }) => {
  return (
    <button className="custom-button">
      <span className="button-text">{text}</span>
      <span className="custom-arrow"></span>
    </button>
  );
};

export default CustomButton;
