import { z } from "zod";

const prioridadeEnum = z.enum(["BAIXA", "MEDIA", "ALTA", "URGENTE"]);
const cardStatusEnum = z.enum([
  "BACKLOG",
  "PRONTO_PARA_SPRINT",
  "A_FAZER",
  "EM_ANDAMENTO",
  "EM_REVISAO",
  "BLOQUEADO",
  "HOMOLOGACAO",
  "CONCLUIDO",
  "CANCELADO",
]);

/** Retorna hoje à meia-noite UTC para comparações de prazo */
function todayMidnight() {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

const prazoFuturo = z
  .string()
  .nullable()
  .optional()
  .refine(
    (val) => {
      if (!val) return true;
      return new Date(val) >= todayMidnight();
    },
    { message: "O prazo não pode ser uma data no passado." }
  );

const subtarefaItem = z.object({
  titulo: z.string().min(1, "Título da subtarefa obrigatório"),
  estimativa: z.number().int().min(0).optional(),
});

export const createCardSchema = z.object({
  titulo: z.string().min(2, "Título obrigatório").max(200, "Título muito longo"),
  descricao: z.string().optional(),
  criteriosAceite: z.string().optional(),
  responsavelId: z.string().optional(),
  responsaveisIds: z.array(z.string()).optional(),
  prioridade: prioridadeEnum.optional().default("MEDIA"),
  estimativa: z.number().int().min(0, "Estimativa não pode ser negativa").optional(),
  prazo: prazoFuturo,
  projetoId: z.string().optional(),
  sprintId: z.string().optional(),
  demandaId: z.string().optional(), // rastreabilidade: demanda de origem
  subtarefas: z.array(subtarefaItem).optional(),
  etiquetasIds: z.array(z.string()).optional(),
});

export const updateCardSchema = z.object({
  titulo: z.string().min(2, "Título muito curto").max(200, "Título muito longo").optional(),
  descricao: z.string().optional(),
  criteriosAceite: z.string().optional(),
  responsavelId: z.string().nullable().optional(),
  responsaveisIds: z.array(z.string()).optional(),
  prioridade: prioridadeEnum.optional(),
  estimativa: z.number().int().min(0, "Estimativa não pode ser negativa").optional(),
  prazo: prazoFuturo,
  status: cardStatusEnum.optional(),
  sprintId: z.string().nullable().optional(),
  bloqueado: z.boolean().optional(),
  motivoBloqueio: z.string().nullable().optional(),
  bloqueadoPorId: z.string().nullable().optional(),
  etiquetasIds: z.array(z.string()).optional(),
});

export type CreateCardInput = z.infer<typeof createCardSchema>;
export type UpdateCardInput = z.infer<typeof updateCardSchema>;
