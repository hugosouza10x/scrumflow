"use client";

import { Sparkles, Loader2 } from "lucide-react";

type AiButtonProps = {
  onClick: () => void;
  loading?: boolean;
  label?: string;
  className?: string;
};

export function AiButton({
  onClick,
  loading = false,
  label = "Gerar com IA",
  className = "",
}: AiButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className={`inline-flex items-center gap-1.5 text-xs font-medium text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300 disabled:opacity-50 transition-colors ${className}`}
    >
      {loading ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        <Sparkles className="h-3 w-3" />
      )}
      {loading ? "Gerando…" : label}
    </button>
  );
}
