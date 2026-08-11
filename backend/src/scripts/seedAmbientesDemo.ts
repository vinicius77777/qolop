/**
 * seedAmbientesDemo.ts
 * --------------------
 * Cria ambientes reais de demonstração (com imagemPreview) para que o
 * efeito "magia do hover" do início e os gráficos do analytics tenham dados.
 *
 * Uso (a partir de backend/):
 *   npx ts-node --transpile-only src/scripts/seedAmbientesDemo.ts
 *
 * O script é idempotente: não duplica ambientes com o mesmo título.
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

const DEMO_USER = {
  nome: "Vinicius",
  email: "demo.vinicius@qolop.app",
  senha: "qolop2026",
};

interface DemoAmbiente {
  titulo: string;
  descricao: string;
  linkVR: string;
  categoria: string;
  cidade: string;
  pais: string;
  latitude: number;
  longitude: number;
  endereco: string;
  imagemPreview: string;
}

const DEMO_AMBIENTES: DemoAmbiente[] = [
  {
    titulo: "Casa Alphaville",
    descricao:
      "Residência ampla com pé-direito duplo, jardim interno e integração total entre sala e área gourmet. Tour 360° completo por todos os ambientes, incluindo suítes, home office e área externa com piscina.",
    linkVR: "https://my.matterport.com/show/?m=K66VfwhMeGh",
    categoria: "Residência",
    cidade: "Alphaville",
    pais: "Brasil",
    latitude: -23.4853,
    longitude: -46.8581,
    endereco: "Alphaville, Barueri - SP",
    imagemPreview: "/uploads/demo-alphaville.png",
  },
  {
    titulo: "Cobertura Jardins",
    descricao:
      "Cobertura com varanda panorâmica, lareira e acabamento em madeira nobre. Visita imersiva ideal para conhecer a distribuição dos ambientes e a vista da região dos Jardins.",
    linkVR: "https://my.matterport.com/show/?m=9YCyuPHLT2n",
    categoria: "Apartamento",
    cidade: "São Paulo",
    pais: "Brasil",
    latitude: -23.5631,
    longitude: -46.6543,
    endereco: "Jardins, São Paulo - SP",
    imagemPreview:
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1600&q=80",
  },
  {
    titulo: "Studio Vila Madalena",
    descricao:
      "Studio compacto e inteligente no coração da Vila Madalena. Espaço pensado para receber bem: cozinha integrada, mezanino e ótima iluminação natural.",
    linkVR: "https://my.matterport.com/show/?m=8kNFyXcULbq",
    categoria: "Comercial",
    cidade: "São Paulo",
    pais: "Brasil",
    latitude: -23.5524,
    longitude: -46.6929,
    endereco: "Vila Madalena, São Paulo - SP",
    imagemPreview:
      "https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=1600&q=80",
  },
];

async function main() {
  console.log("[SEED] Iniciando seed de ambientes demo...");

  const senhaHash = await bcrypt.hash(DEMO_USER.senha, 10);

  const usuario = await prisma.usuario.upsert({
    where: { email: DEMO_USER.email },
    update: {},
    create: {
      nome: DEMO_USER.nome,
      email: DEMO_USER.email,
      senha: senhaHash,
      role: "user",
    },
  });

  console.log(`[SEED] Usuário demo garantido: ${usuario.email} (id=${usuario.id})`);

  let criados = 0;
  let jaExistentes = 0;

  for (const amb of DEMO_AMBIENTES) {
    const existe = await prisma.ambiente.findFirst({
      where: { titulo: amb.titulo },
    });

    if (existe) {
      jaExistentes += 1;
      console.log(`[SEED] Ambiente já existe, pulando: "${amb.titulo}" (id=${existe.id})`);
      continue;
    }

    await prisma.ambiente.create({
      data: {
        titulo: amb.titulo,
        descricao: amb.descricao,
        linkVR: amb.linkVR,
        categoria: amb.categoria,
        cidade: amb.cidade,
        pais: amb.pais,
        latitude: amb.latitude,
        longitude: amb.longitude,
        endereco: amb.endereco,
        imagemPreview: amb.imagemPreview,
        publico: true,
        usuarioId: usuario.id,
        updatedAt: new Date(),
      },
    });

    criados += 1;
    console.log(`[SEED] Ambiente criado: "${amb.titulo}"`);
  }

  console.log(
    `[SEED] Concluído: ${criados} criados, ${jaExistentes} já existentes.`
  );
}

main()
  .catch((error) => {
    console.error("[SEED] Falha ao executar seed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
