"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000,      // dados ficam "frescos" por 5 min
            gcTime: 10 * 60 * 1000,         // cache mantido por 10 min após desuso
            refetchOnWindowFocus: false,     // não refetch ao voltar para a aba
            refetchOnReconnect: true,        // refetch ao voltar de offline
            retry: 1,                        // só 1 retry em falha (era 3)
          },
          mutations: {
            retry: 0,                        // mutações não fazem retry automático
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
