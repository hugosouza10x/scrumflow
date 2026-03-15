"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import type { SessionUser } from "@/types";
import {
  LayoutDashboard,
  FolderKanban,
  ListTodo,
  Users,
  Layers,
  Columns3,
  BookOpen,
  Zap,
  Building2,
  CheckSquare,
  Triangle,
  X,
} from "lucide-react";
import { useSidebar } from "./sidebar-provider";

type NavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
  exact?: boolean;
  badge?: boolean;
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

const navGroups: NavGroup[] = [
  {
    label: "Visão geral",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, exact: true },
    ],
  },
  {
    label: "Pessoal",
    items: [
      { href: "/dashboard/meu-trabalho", label: "Meu Trabalho", icon: CheckSquare, badge: true },
      { href: "/dashboard/updates", label: "Meu Diário", icon: BookOpen },
    ],
  },
  {
    label: "Execução",
    items: [
      { href: "/dashboard/kanban", label: "Kanban", icon: Columns3 },
      { href: "/dashboard/backlog", label: "Backlog", icon: ListTodo },
      { href: "/dashboard/sprints", label: "Sprints", icon: Layers },
    ],
  },
  {
    label: "Gestão",
    items: [
      { href: "/dashboard/projetos", label: "Projetos", icon: FolderKanban },
      { href: "/dashboard/clientes", label: "Clientes", icon: Building2 },
      { href: "/dashboard/epicos", label: "Épicos", icon: Triangle },
    ],
  },
];

function getInitials(nome: string) {
  return nome
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

function SidebarContent({ user, onClose }: { user: SessionUser; onClose?: () => void }) {
  const pathname = usePathname();

  const { data: countData } = useQuery<{ total: number }>({
    queryKey: ["meu-trabalho-count"],
    queryFn: async () => {
      const res = await fetch("/api/meu-trabalho/count");
      if (!res.ok) return { total: 0 };
      return res.json();
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const pendingCount = countData?.total ?? 0;

  function NavLink({ item }: { item: NavItem }) {
    const Icon = item.icon;
    const isActive = item.exact
      ? pathname === item.href
      : pathname === item.href || pathname.startsWith(item.href + "/");

    return (
      <Link
        href={item.href}
        onClick={onClose}
        className={cn(
          "relative flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors overflow-hidden",
          isActive
            ? "bg-primary/10 text-primary font-medium"
            : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
        )}
      >
        {isActive && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-0.5 rounded-r-full bg-primary" />
        )}
        <Icon className="h-4 w-4 shrink-0" strokeWidth={1.5} />
        <span className="flex-1 truncate">{item.label}</span>
        {item.badge && pendingCount > 0 && (
          <span className="ml-auto inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
            {pendingCount > 99 ? "99+" : pendingCount}
          </span>
        )}
      </Link>
    );
  }

  return (
    <div className="flex w-56 flex-col h-full bg-card">
      <div className="flex items-center gap-2 p-4 border-b border-border/60">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
          <Zap className="h-4 w-4" strokeWidth={1.5} />
        </div>
        <Link href="/dashboard" className="font-semibold text-foreground flex-1">
          ScrumFlow
        </Link>
        {onClose && (
          <button
            onClick={onClose}
            className="xl:hidden h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
          >
            <X className="h-4 w-4" strokeWidth={1.5} />
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto p-2 space-y-4">
        {navGroups.map((group) => (
          <div key={group.label}>
            <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavLink key={item.href} item={item} />
              ))}
            </div>
          </div>
        ))}

        {user.cargo.slug === "admin" && (
          <div>
            <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
              Admin
            </p>
            <Link
              href="/dashboard/usuarios"
              onClick={onClose}
              className={cn(
                "relative flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors overflow-hidden",
                pathname.startsWith("/dashboard/usuarios")
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
              )}
            >
              {pathname.startsWith("/dashboard/usuarios") && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-0.5 rounded-r-full bg-primary" />
              )}
              <Users className="h-4 w-4" strokeWidth={1.5} />
              Usuários
            </Link>
          </div>
        )}
      </nav>

      <div className="border-t border-border/60 p-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary ring-1 ring-border">
            {getInitials(user.nome)}
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs font-medium">{user.nome}</p>
            <p className="truncate text-xs text-muted-foreground">{user.cargo.nome}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Sidebar({ user }: { user: SessionUser }) {
  const { open, close } = useSidebar();

  return (
    <>
      {/* Desktop sidebar — always visible on xl+ */}
      <aside className="hidden xl:flex flex-col w-56 flex-shrink-0 border-r border-border/60">
        <SidebarContent user={user} />
      </aside>

      {/* Mobile overlay */}
      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/40 xl:hidden"
            onClick={close}
            aria-hidden="true"
          />
          {/* Drawer */}
          <aside className="fixed inset-y-0 left-0 z-50 flex flex-col border-r shadow-xl xl:hidden">
            <SidebarContent user={user} onClose={close} />
          </aside>
        </>
      )}
    </>
  );
}
