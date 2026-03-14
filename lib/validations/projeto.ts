import { z } from "zod";

const prioridadeEnum = z.enum(["BAIXA", "MEDIA", "ALTA", "URGENTE"]);
const statusEnum = z.enum(["ATIVO", "PAUSADO", "CONCLUIDO", "CANCELADO"]);

export const createProjetoSchema = z.object({
  nome: z.string().min(2, "Nome obrigatório"),
  descricao: z.string().optional(),
  status: statusEnum.optional().default("ATIVO"),
  prioridade: prioridadeEnum.optional().default("MEDIA"),
  liderId: z.string().optional(),
  clienteId: z.string().optional(),
  dataInicio: z.string().optional(),
  dataPrevisao: z.string().optional(),
  membrosIds: z.array(z.string()).optional(),
});

export const updateProjetoSchema = createProjetoSchema.partial();

export type CreateProjetoInput = z.infer<typeof createProjetoSchema>;
export type UpdateProjetoInput = z.infer<typeof updateProjetoSchema>;
