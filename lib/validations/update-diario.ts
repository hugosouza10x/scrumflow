import { z } from "zod";

export const createUpdateDiarioSchema = z.object({
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data no formato YYYY-MM-DD"),
  trabalheiHoje: z.string().optional(),
  concluido: z.string().optional(),
  proximoPasso: z.string().optional(),
  bloqueio: z.boolean().optional().default(false),
});

export type CreateUpdateDiarioInput = z.infer<typeof createUpdateDiarioSchema>;
