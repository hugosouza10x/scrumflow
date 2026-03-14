"use client";

import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

export function LogoutButton({ className }: { className?: string }) {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      className={cn("text-sm text-muted-foreground hover:text-foreground", className)}
    >
      Sair
    </button>
  );
}
