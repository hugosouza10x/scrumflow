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
        <Menu className="h-5 w-5" />
      </button>

      <button
        onClick={() => setSearchOpen(true)}
        className="flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted transition-colors"
      >
        <Search className="h-3.5 w-3.5" />
        <span>Buscar...</span>
        <kbd className="ml-2 hidden rounded border px-1.5 py-0.5 text-xs sm:flex">Ctrl K</kbd>
      </button>

      <div className="ml-auto flex items-center gap-1">
        <NotificationBell />
        <LogoutButton />
      </div>

      <SearchCommand open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  );
}
