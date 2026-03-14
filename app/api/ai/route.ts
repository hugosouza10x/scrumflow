import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { openai, OPENAI_MODEL } from "@/lib/openai";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

const ALLOWED_ACTIONS = ["generate-task", "improve-description", "generate-criteria", "suggest-title"];

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ message: "Não autorizado." }, { status: 401 });
  }

  // Rate limiting por usuário
  const rl = rateLimit(`ai:${session.id}`, RATE_LIMITS.ai);
  if (!rl.success) {
    return NextResponse.json(
      { message: "Limite de chamadas IA atingido. Tente novamente em 1 minuto." },
      { status: 429, headers: { "Retry-After": "60" } }
    );
  }

  const body = await request.json();
  const { action, prompt, titulo, descricao } = body;

  if (!action || !ALLOWED_ACTIONS.includes(action)) {
    return NextResponse.json({ message: "Ação desconhecida." }, { status: 400 });
  }

  try {
    if (action === "generate-task") {
      // Gera titulo + descricao + prioridade + tipo a partir de texto livre
      const completion = await openai.chat.completions.create({
        model: OPENAI_MODEL,
        temperature: 0.4,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: `Você é um assistente de gerenciamento de projetos de software. Gere dados estruturados para um card/demanda de desenvolvimento.
Retorne APENAS JSON com os campos:
- "titulo": string (título conciso, máximo 80 caracteres, começa com verbo no infinitivo)
- "descricao": string (descrição clara em markdown, 2-4 parágrafos com contexto, impacto e detalhes técnicos relevantes)
- "prioridade": "BAIXA" | "MEDIA" | "ALTA" | "URGENTE" (baseado no contexto)
- "tipo": string (ex: "bug", "feature", "melhoria", "refatoração", "chore", "documentação")`,
          },
          {
            role: "user",
            content: `Gere um card de desenvolvimento para: "${prompt}"`,
          },
        ],
      });

      const result = JSON.parse(completion.choices[0].message.content ?? "{}");
      return NextResponse.json(result);
    }

    if (action === "improve-description") {
      // Melhora/expande uma descrição existente
      const completion = await openai.chat.completions.create({
        model: OPENAI_MODEL,
        temperature: 0.3,
        messages: [
          {
            role: "system",
            content: `Você é um assistente de gerenciamento ágil. Melhore a descrição de um card de desenvolvimento.
Regras:
- Use markdown (negrito, listas, código inline quando necessário)
- Inclua: contexto/problema, comportamento esperado, detalhes técnicos relevantes
- Seja objetivo e profissional
- Máximo 300 palavras
- Responda APENAS com o texto da descrição melhorada, sem prefixos ou comentários`,
          },
          {
            role: "user",
            content: `Título: ${titulo}\n\nDescrição atual: ${descricao || "(vazia)"}`,
          },
        ],
      });

      return NextResponse.json({
        descricao: completion.choices[0].message.content?.trim() ?? "",
      });
    }

    if (action === "generate-criteria") {
      // Gera critérios de aceite a partir do titulo e descrição
      const completion = await openai.chat.completions.create({
        model: OPENAI_MODEL,
        temperature: 0.3,
        messages: [
          {
            role: "system",
            content: `Você é um assistente de QA e gerenciamento ágil. Gere critérios de aceite claros e testáveis para um card.
Formato: lista markdown com checkboxes (- [ ] item)
Regras:
- 4 a 8 critérios objetivos e verificáveis
- Use linguagem "Dado/Quando/Então" quando aplicável
- Cubra casos de sucesso, validações e edge cases relevantes
- Responda APENAS com a lista de critérios, sem prefixos`,
          },
          {
            role: "user",
            content: `Título: ${titulo}\n\nDescrição: ${descricao || "(vazia)"}`,
          },
        ],
      });

      return NextResponse.json({
        criteriosAceite: completion.choices[0].message.content?.trim() ?? "",
      });
    }

    if (action === "suggest-title") {
      // Refina/melhora um título rápido digitado no kanban
      const completion = await openai.chat.completions.create({
        model: OPENAI_MODEL,
        temperature: 0.3,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: `Você é um assistente ágil. A partir de um texto informal, gere um título profissional para um card e sugira a prioridade.
Retorne JSON com:
- "titulo": string (conciso, começa com verbo no infinitivo, máx 80 chars)
- "prioridade": "BAIXA" | "MEDIA" | "ALTA" | "URGENTE"`,
          },
          {
            role: "user",
            content: `Texto do usuário: "${prompt}"`,
          },
        ],
      });

      const result = JSON.parse(completion.choices[0].message.content ?? "{}");
      return NextResponse.json(result);
    }

    return NextResponse.json({ message: "Ação desconhecida." }, { status: 400 });
  } catch (e) {
    logger.error({ err: e });
    return NextResponse.json({ message: "Erro ao chamar IA." }, { status: 500 });
  }
}
