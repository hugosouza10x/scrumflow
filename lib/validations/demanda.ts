import { z } from "zod";

const prioridadeEnum = z.enum(["BAIXA", "MEDIA", "ALTA", "URGENTE"]);
const statusRefinamentoEnum = z.enum(["NAO_REFINADO", "EM_REFINAMENTO", "PRONTO_PARA_SPRINT"]);

export const createDemandaSchema = z.object({
  titulo: z.string().min(2, "Título obrigatório"),
  descricao: z.string().optional(),
  solicitanteId: z.string().optional(),
  responsavelId: z.string().optional(),
  origem: z.string().optional(),
  impacto: z.string().optional(),
  prioridade: prioridadeEnum.optional().default("MEDIA"),
  tipo: z.string().optional(),
  projetoId: z.string().optional(),
});

export const updateDemandaSchema = z.object({
  titulo: z.string().min(2).optional(),
  descricao: z.string().optional(),
  statusRefinamento: statusRefinamentoEnum.optional(),
  prioridade: prioridadeEnum.optional(),
  tipo: z.string().optional(),
  responsavelId: z.string().nullable().optional(),
  arquivada: z.boolean().optional(),
});

export type CreateDemandaInput = z.infer<typeof createDemandaSchema>;
export type UpdateDemandaInput = z.infer<typeof updateDemandaSchema>;
