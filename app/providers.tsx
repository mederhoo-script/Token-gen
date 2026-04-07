"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import {
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
} from "@/components/ui/toast";
import { ToastContext, useToastContextValue, useToastState } from "@/lib/hooks/use-toast";

function Toaster() {
  const { toasts, dismiss } = useToastState();
  return (
    <>
      {toasts.map(({ id, title, description, variant }) => (
        <Toast key={id} variant={variant} onOpenChange={(open) => !open && dismiss(id)}>
          {title && <ToastTitle>{title}</ToastTitle>}
          <ToastDescription>{description}</ToastDescription>
          <ToastClose />
        </Toast>
      ))}
    </>
  );
}

function ToastStateProvider({ children }: { children: React.ReactNode }) {
  const value = useToastContextValue();
  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { staleTime: 60_000 } } }),
  );
  return (
    <QueryClientProvider client={queryClient}>
      <ToastStateProvider>
        <ToastProvider>
          {children}
          <Toaster />
          <ToastViewport />
        </ToastProvider>
      </ToastStateProvider>
    </QueryClientProvider>
  );
}
