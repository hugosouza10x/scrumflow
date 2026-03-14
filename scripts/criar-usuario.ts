/**
 * Cria um usuário no banco para login.
 * Uso (PowerShell):
 *   $env:EMAIL="seu@email.com"; $env:SENHA="suaSenha123"; npx tsx scripts/criar-usuario.ts
 * Uso (cmd):
 *   set EMAIL=seu@email.com && set SENHA=suaSenha123 && npx tsx scripts/criar-usuario.ts
 *
 * Se não passar EMAIL/SENHA, cria: admin@scrumflow.local / admin123
 */
import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.EMAIL || "admin@scrumflow.local";
  const senha = process.env.SENHA || "admin123";
  const nome = process.env.NOME || "Administrador";

  const cargo = await prisma.cargo.findFirst({ where: { slug: "admin" } });
  if (!cargo) {
    console.error("Nenhum cargo 'admin' encontrado. Rode primeiro: npm run db:seed");
    process.exit(1);
  }

  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existing) {
    console.log("Usuário já existe com este e-mail. Atualizando a senha...");
    await prisma.user.update({
      where: { id: existing.id },
      data: { passwordHash: await hash(senha, 10) },
    });
    console.log("Senha atualizada. Use:", email, "/", senha);
  } else {
    await prisma.user.create({
      data: {
        nome,
        email: email.toLowerCase(),
        passwordHash: await hash(senha, 10),
        cargoId: cargo.id,
        status: "ATIVO",
      },
    });
    console.log("Usuário criado. Use para login:", email, "/", senha);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
