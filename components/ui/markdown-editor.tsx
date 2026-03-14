"use client";

import { useState } from "react";
import { MarkdownContent } from "@/components/ui/markdown-content";
import { cn } from "@/lib/utils";

interface MarkdownEditorProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
}

export function MarkdownEditor({
  id,
  value,
  onChange,
  placeholder = "Suporta **negrito**, *itálico*, `código`, listas...",
  rows = 5,
  className,
}: MarkdownEditorProps) {
  const [preview, setPreview] = useState(false);

  return (
    <div className={cn("rounded-md border", className)}>
      <div className="flex items-center gap-1 border-b bg-muted/30 px-2 py-1">
        <button
          type="button"
          onClick={() => setPreview(false)}
          className={cn(
            "rounded px-2.5 py-1 text-xs font-medium transition-colors",
            !preview
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Editar
        </button>
        <button
          type="button"
          onClick={() => setPreview(true)}
          className={cn(
            "rounded px-2.5 py-1 text-xs font-medium transition-colors",
            preview
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Prévia
        </button>
        <span className="ml-auto text-xs text-muted-foreground">Markdown</span>
      </div>

      {preview ? (
        <div className="min-h-[80px] px-3 py-2">
          {value.trim() ? (
            <MarkdownContent content={value} />
          ) : (
            <p className="text-sm text-muted-foreground italic">Nada para visualizar.</p>
          )}
        </div>
      ) : (
        <textarea
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          className="w-full resize-none bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
        />
      )}
    </div>
  );
}
