interface HeroContentProps {
  distort?: boolean;
}

const HeroContent: React.FC<HeroContentProps> = ({ distort }) => {
  return (
    <div className={`content ${distort ? "distorted-text" : ""}`}>
      <h1>Bem-vindo ao Qolop</h1>
      <p>Explore nossos ambientes e faça seus pedidos com facilidade!</p>
    </div>
  );
};

export default HeroContent;
