export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false }, { status: 401 });

  await prisma.user.update({
    where: { id: session.id },
    data: { lastSeenAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
