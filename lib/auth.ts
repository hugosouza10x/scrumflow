import { compare, hash } from "bcryptjs";
import { prisma } from "./prisma";
import type { SessionUser } from "@/types";

const SALT_ROUNDS = 10;

export async function hashPassword(password: string): Promise<string> {
  return hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hashStr: string): Promise<boolean> {
  return compare(password, hashStr);
}

export async function findUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email: email.toLowerCase(), status: "ATIVO" },
    include: { cargo: true },
  });
}

export async function getSessionUserFromDb(userId: string): Promise<SessionUser | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId, status: "ATIVO" },
    include: { cargo: true },
  });
  if (!user) return null;
  return {
    id: user.id,
    nome: user.nome,
    email: user.email,
    cargo: { id: user.cargo.id, nome: user.cargo.nome, slug: user.cargo.slug },
    status: user.status,
  };
}

/** Cargos que podem criar projetos, sprints e cards */
export const CARGOS_GESTAO = ["gestor", "tech_lead", "admin"] as const;

/** Cargo que pode gerenciar usuários */
export const CARGO_ADMIN = "admin" as const;

export function canManageUsers(cargoSlug: string): boolean {
  return cargoSlug === CARGO_ADMIN;
}

export function canCreateProjects(cargoSlug: string): boolean {
  return CARGOS_GESTAO.includes(cargoSlug as (typeof CARGOS_GESTAO)[number]);
}
