import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const cargos = [
    { nome: "Administrador", slug: "admin" },
    { nome: "Gestor", slug: "gestor" },
    { nome: "Tech Lead", slug: "tech_lead" },
    { nome: "Desenvolvedor", slug: "desenvolvedor" },
    { nome: "Analista", slug: "analista" },
  ];

  for (const c of cargos) {
    await prisma.cargo.upsert({
      where: { slug: c.slug },
      create: c,
      update: { nome: c.nome },
    });
  }

  const templates = [
    {
      nome: "Bug",
      slug: "bug",
      subtarefasSugeridas: [
        { titulo: "Reproduzir o bug", ordem: 0 },
        { titulo: "Identificar causa raiz", ordem: 1 },
        { titulo: "Implementar correção", ordem: 2 },
        { titulo: "Testar e validar", ordem: 3 },
      ],
    },
    {
      nome: "Nova Feature",
      slug: "nova_feature",
      subtarefasSugeridas: [
        { titulo: "Especificar requisitos", ordem: 0 },
        { titulo: "Desenhar solução", ordem: 1 },
        { titulo: "Implementar", ordem: 2 },
        { titulo: "Testes e documentação", ordem: 3 },
      ],
    },
    {
      nome: "Melhoria",
      slug: "melhoria",
      subtarefasSugeridas: [
        { titulo: "Definir escopo da melhoria", ordem: 0 },
        { titulo: "Implementar", ordem: 1 },
        { titulo: "Validar", ordem: 2 },
      ],
    },
    {
      nome: "Infraestrutura",
      slug: "infraestrutura",
      subtarefasSugeridas: [
        { titulo: "Planejar mudanças", ordem: 0 },
        { titulo: "Aplicar/configurar", ordem: 1 },
        { titulo: "Validar e documentar", ordem: 2 },
      ],
    },
  ];

  for (const t of templates) {
    await prisma.cardTemplate.upsert({
      where: { slug: t.slug },
      create: t,
      update: { nome: t.nome, subtarefasSugeridas: t.subtarefasSugeridas as object },
    });
  }

  const adminCargo = await prisma.cargo.findUnique({ where: { slug: "admin" } });
  if (adminCargo) {
    const email = "admin@scrumflow.local";
    const existing = await prisma.user.findUnique({ where: { email } });
    if (!existing) {
      await prisma.user.create({
        data: {
          nome: "Administrador",
          email,
          passwordHash: await hash("admin123", 10),
          cargoId: adminCargo.id,
          status: "ATIVO",
        },
      });
      console.log("Usuário admin criado: admin@scrumflow.local / admin123");
    }
  }

  console.log("Seed concluído.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
