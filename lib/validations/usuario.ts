import { z } from "zod";

export const createUsuarioSchema = z.object({
  nome: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  email: z.string().email("E-mail inválido"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  cargoId: z.string().min(1, "Cargo obrigatório"),
  status: z.enum(["ATIVO", "INATIVO"]).optional().default("ATIVO"),
});

export const updateUsuarioSchema = z.object({
  nome: z.string().min(2).optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  cargoId: z.string().optional(),
  status: z.enum(["ATIVO", "INATIVO"]).optional(),
});

export type CreateUsuarioInput = z.infer<typeof createUsuarioSchema>;
export type UpdateUsuarioInput = z.infer<typeof updateUsuarioSchema>;
