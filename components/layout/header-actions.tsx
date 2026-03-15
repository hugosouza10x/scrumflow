"use client";

import { useState, useEffect } from "react";
import { Search, Menu } from "lucide-react";
import { NotificationBell } from "@/components/layout/notification-bell";
import { LogoutButton } from "@/components/layout/logout-button";
import { SearchCommand } from "@/components/search/search-command";
import { useSidebar } from "@/components/layout/sidebar-provider";

export function HeaderActions() {
  const [searchOpen, setSearchOpen] = useState(false);
  const { toggle } = useSidebar();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <>
      {/* Hamburger — visible only on < xl */}
      <button
        onClick={toggle}
        className="xl:hidden h-8 w-8 flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted transition-colors"
        aria-label="Abrir menu"
      >
        <Menu className="h-5 w-5" strokeWidth={1.5} />
      </button>

      <button
        onClick={() => setSearchOpen(true)}
        className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/40 shadow-sm px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted/70 transition-colors"
      >
        <Search className="h-3.5 w-3.5" strokeWidth={1.5} />
        <span>Buscar...</span>
        <kbd className="ml-2 hidden rounded border border-border/60 bg-background px-1.5 py-0.5 text-[10px] font-mono shadow-sm sm:flex">Ctrl K</kbd>
      </button>

      <div className="ml-auto flex items-center gap-1">
        <NotificationBell />
        <LogoutButton />
      </div>

      <SearchCommand open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  );
}
