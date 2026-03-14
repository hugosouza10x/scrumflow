import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { HeaderActions } from "@/components/layout/header-actions";
import { NavigationProgress } from "@/components/ui/navigation-progress";
import { ErrorBoundary, SectionErrorBoundary } from "@/components/ui/error-boundary";
import { SidebarProvider } from "@/components/layout/sidebar-provider";
import { Heartbeat } from "@/components/layout/heartbeat";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <SidebarProvider>
    <Heartbeat />
    <div className="flex min-h-screen">
      <NavigationProgress />
      <SectionErrorBoundary section="menu lateral">
        <Sidebar user={session} />
      </SectionErrorBoundary>
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden bg-muted/20">
        <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex h-14 items-center gap-4 px-6">
            <SectionErrorBoundary section="barra de ações">
              <HeaderActions />
            </SectionErrorBoundary>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          <div className="p-3 md:p-4 lg:p-6">
            <ErrorBoundary>{children}</ErrorBoundary>
          </div>
        </div>
      </main>
    </div>
    </SidebarProvider>
  );
}
