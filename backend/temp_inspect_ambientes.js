const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const ambientes = await prisma.ambiente.findMany({
    orderBy: { id: "desc" },
    take: 20,
    select: {
      id: true,
      titulo: true,
      publico: true,
      latitude: true,
      longitude: true,
      cidade: true,
      pais: true,
      endereco: true,
      cep: true,
      usuarioId: true,
      empresaId: true,
      pedidoId: true,
    },
  });

  console.log(JSON.stringify(ambientes, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
