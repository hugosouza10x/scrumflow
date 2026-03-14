"use client";

import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex flex-col items-center justify-center min-h-[300px] gap-4 p-8">
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10">
            <AlertTriangle className="w-8 h-8 text-destructive" />
          </div>
          <div className="text-center space-y-2">
            <h3 className="text-lg font-semibold">Algo deu errado</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              Ocorreu um erro inesperado. Tente recarregar a página ou entre em contato com o suporte.
            </p>
            {this.state.error && process.env.NODE_ENV === "development" && (
              <pre className="mt-2 p-3 bg-muted rounded-lg text-xs text-left overflow-auto max-w-lg">
                {this.state.error.message}
              </pre>
            )}
          </div>
          <Button
            variant="outline"
            onClick={() => {
              this.setState({ hasError: false, error: undefined });
              window.location.reload();
            }}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Recarregar página
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * ErrorBoundary compacto para seções menores (cards, sidebars, etc.)
 */
export class SectionErrorBoundary extends React.Component<
  { children: React.ReactNode; section?: string },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode; section?: string }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`[ErrorBoundary:${this.props.section ?? "section"}]`, error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground border rounded-lg bg-muted/30">
          <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
          <span>Erro ao carregar {this.props.section ?? "esta seção"}.</span>
          <button
            className="text-primary hover:underline ml-auto text-xs"
            onClick={() => this.setState({ hasError: false, error: undefined })}
          >
            Tentar novamente
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
