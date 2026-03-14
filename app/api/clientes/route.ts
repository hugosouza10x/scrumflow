import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { clienteService } from "@/services/cliente.service";
import { logger } from "@/lib/logger";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Não autorizado." }, { status: 401 });

  try {
    const clientes = await clienteService.list();
    return NextResponse.json(clientes);
  } catch (e) {
    logger.error({ err: e });
    return NextResponse.json({ message: "Erro ao listar clientes." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Não autorizado." }, { status: 401 });

  try {
    const body = await request.json();
    if (!body.nome?.trim()) {
      return NextResponse.json({ message: "Nome do cliente é obrigatório." }, { status: 400 });
    }
    const cliente = await clienteService.create({
      nome: body.nome.trim(),
      email: body.email?.trim() || undefined,
      telefone: body.telefone?.trim() || undefined,
      cor: body.cor || undefined,
    });
    return NextResponse.json(cliente);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro ao criar cliente.";
    return NextResponse.json({ message: msg }, { status: 400 });
  }
}
