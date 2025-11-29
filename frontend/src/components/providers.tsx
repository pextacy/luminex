'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { WalletProvider } from '@/lib/wallet/provider';
import { WebSocketProvider } from '@/lib/websocket/provider';

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <WalletProvider>
        <WebSocketProvider>
          {children}
        </WebSocketProvider>
      </WalletProvider>
    </QueryClientProvider>
  );
}
