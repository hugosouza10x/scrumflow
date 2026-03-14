import { NextRequest, NextResponse } from "next/server";
import { findUserByEmail, verifyPassword } from "@/lib/auth";
import { createSession } from "@/lib/session";
import { loginSchema } from "@/lib/validations/auth";
import { rateLimit, RATE_LIMITS, getClientIp } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    // Rate limiting por IP
    const ip = getClientIp(request);
    const rl = rateLimit(`login:${ip}`, RATE_LIMITS.login);
    if (!rl.success) {
      return NextResponse.json(
        { message: "Muitas tentativas de login. Tente novamente em 1 minuto." },
        { status: 429, headers: { "Retry-After": "60" } }
      );
    }

    const body = await request.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Dados inválidos", errors: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const user = await findUserByEmail(parsed.data.email);
    if (!user) {
      return NextResponse.json({ message: "E-mail ou senha inválidos." }, { status: 401 });
    }

    const ok = await verifyPassword(parsed.data.password, user.passwordHash);
    if (!ok) {
      return NextResponse.json({ message: "E-mail ou senha inválidos." }, { status: 401 });
    }

    await createSession(user.id);
    return NextResponse.json({
      user: {
        id: user.id,
        nome: user.nome,
        email: user.email,
        cargo: { id: user.cargo.id, nome: user.cargo.nome, slug: user.cargo.slug },
        status: user.status,
      },
    });
  } catch (e) {
    logger.error({ err: e });
    return NextResponse.json({ message: "Erro ao autenticar." }, { status: 500 });
  }
}
