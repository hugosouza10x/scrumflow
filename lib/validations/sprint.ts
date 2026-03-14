import { z } from "zod";

const sprintStatusEnum = z.enum(["PLANEJADA", "EM_ANDAMENTO", "CONCLUIDA", "CANCELADA"]);

const membroSchema = z.object({
  userId: z.string(),
  capacidade: z.number().int().min(0).optional(),
});

export const createSprintSchema = z
  .object({
    nome: z.string().min(2, "Nome obrigatório"),
    objetivo: z.string().optional(),
    dataInicio: z.string().min(1, "Data de início obrigatória"),
    dataFim: z.string().min(1, "Data de fim obrigatória"),
    capacidadeTotal: z.number().int().min(0).optional(),
    projetoId: z.string().min(1, "Projeto obrigatório"),
    membros: z.array(membroSchema).optional(),
  })
  .refine((data) => new Date(data.dataFim) >= new Date(data.dataInicio), {
    message: "Data de fim deve ser maior ou igual à data de início",
    path: ["dataFim"],
  });

export const updateSprintSchema = z
  .object({
    nome: z.string().min(2).optional(),
    objetivo: z.string().optional(),
    dataInicio: z.string().optional(),
    dataFim: z.string().optional(),
    capacidadeTotal: z.number().int().min(0).optional(),
    status: sprintStatusEnum.optional(),
    membros: z.array(membroSchema).optional(),
  })
  .refine(
    (data) => {
      if (data.dataInicio && data.dataFim) {
        return new Date(data.dataFim) >= new Date(data.dataInicio);
      }
      return true;
    },
    {
      message: "Data de fim deve ser maior ou igual à data de início",
      path: ["dataFim"],
    }
  );

export type CreateSprintInput = z.infer<typeof createSprintSchema>;
export type UpdateSprintInput = z.infer<typeof updateSprintSchema>;
