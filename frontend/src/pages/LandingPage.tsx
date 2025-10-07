import { useState } from "react";
import SidebarMenu from "../components/SidebarMenu";
import CustomButton from "../components/CustomButton";
import Gallery from "../components/Gallery";
import ProfileMenu from "../components/ProfileMenu";
import VenomTransition from "../components/VenomTransition";
import HeroContent from "../components/HeroContent";
import { Inicio, Ambientes, Pedidos } from "../components/Sections";

export default function LandingPage() {
  const [distort, setDistort] = useState(false);

  return (
    <main className="relative min-h-screen bg-black text-white overflow-hidden">
      {/* Fundo animado / distorção */}
      <div
        className={`absolute inset-0 -z-10 bg-[url('/img/background.png')] bg-cover ${
          distort ? "animate-distorted" : "animate-moveBackground"
        }`}
      />

      {/* Menu lateral */}
      <SidebarMenu />

      {/* Profile dropdown */}
      <ProfileMenu />

      {/* Conteúdo central */}
      <HeroContent distort={distort} />

      {/* Botão que ativa distorção */}
      <VenomTransition target="#explorar">
        <CustomButton text="Explorar mais" />
      </VenomTransition>

      {/* Seções internas */}
      <Inicio />
      <Ambientes />
      <Pedidos />

      {/* Galeria de imagens */}
      <Gallery
        images={[
          "/img/gallery1.jpg",
          "/img/gallery2.jpg",
          "/img/gallery3.jpg",
        ]}
        distort={distort}
      />
    </main>
  );
}
