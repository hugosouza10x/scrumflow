import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const COOKIE_NAME = "scrumflow_session";
const authPath = "/login";

/** Rotas de API que não precisam de autenticação */
const PUBLIC_API_ROUTES = ["/api/auth/login", "/api/auth/logout"];

/** Rotas de página públicas */
const PUBLIC_PAGE_PATHS = ["/", "/login"];

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret && process.env.NODE_ENV === "production") {
    throw new Error("AUTH_SECRET não definido em produção. Defina a variável de ambiente AUTH_SECRET.");
  }
  return new TextEncoder().encode(secret || "dev-secret-change-in-production");
}

async function verifyToken(token: string): Promise<boolean> {
  try {
    await jwtVerify(token, getSecret());
    return true;
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get(COOKIE_NAME);
  const token = sessionCookie?.value;

  // ── Rotas de API ──
  if (pathname.startsWith("/api/")) {
    // APIs públicas passam direto
    if (PUBLIC_API_ROUTES.some((route) => pathname === route)) {
      return NextResponse.next();
    }

    // Todas as outras APIs exigem JWT válido
    if (!token || !(await verifyToken(token))) {
      return NextResponse.json(
        { message: "Não autorizado. Sessão inválida ou expirada." },
        { status: 401 }
      );
    }

    return NextResponse.next();
  }

  // ── Rotas de página ──
  const isPublicPage = PUBLIC_PAGE_PATHS.some((p) => pathname === p);
  const hasSession = Boolean(token);

  // Redirecionar para login se não autenticado em página protegida
  if (!hasSession && !isPublicPage) {
    const url = new URL(authPath, request.url);
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }

  // Redirecionar para dashboard se já autenticado na página de login
  if (hasSession && pathname === authPath) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
