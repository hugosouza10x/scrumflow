import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import type { CreateUsuarioInput, UpdateUsuarioInput } from "@/lib/validations/usuario";

export const usuarioService = {
  async list() {
    return prisma.user.findMany({
      include: { cargo: true },
      orderBy: { nome: "asc" },
    });
  },

  async listActive() {
    return prisma.user.findMany({
      where: { status: "ATIVO" },
      include: { cargo: true },
      orderBy: { nome: "asc" },
    });
  },

  async getById(id: string) {
    return prisma.user.findUnique({
      where: { id },
      include: { cargo: true },
    });
  },

  async getByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { cargo: true },
    });
  },

  async create(data: CreateUsuarioInput) {
    const existing = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });
    if (existing) throw new Error("Já existe um usuário com este e-mail.");

    const passwordHash = await hashPassword(data.password);
    return prisma.user.create({
      data: {
        nome: data.nome,
        email: data.email.toLowerCase(),
        passwordHash,
        cargoId: data.cargoId,
        status: data.status ?? "ATIVO",
      },
      include: { cargo: true },
    });
  },

  async update(id: string, data: UpdateUsuarioInput) {
    if (data.email) {
      const existing = await prisma.user.findFirst({
        where: { email: data.email.toLowerCase(), NOT: { id } },
      });
      if (existing) throw new Error("Já existe um usuário com este e-mail.");
    }

    const updateData: Parameters<typeof prisma.user.update>[0]["data"] = {
      ...(data.nome && { nome: data.nome }),
      ...(data.email && { email: data.email.toLowerCase() }),
      ...(data.cargoId && { cargoId: data.cargoId }),
      ...(data.status && { status: data.status }),
    };
    if (data.password) {
      updateData.passwordHash = await hashPassword(data.password);
    }

    return prisma.user.update({
      where: { id },
      data: updateData,
      include: { cargo: true },
    });
  },

  async delete(id: string) {
    return prisma.user.delete({ where: { id } });
  },
};
