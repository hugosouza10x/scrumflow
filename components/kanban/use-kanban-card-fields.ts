"use client";

import { useCallback, useEffect, useState } from "react";

export type KanbanCardFields = {
  prazo: boolean;
  criacao: boolean;
  responsavel: boolean;
  prioridade: boolean;
  estimativa: boolean;
  subtarefas: boolean;
  projeto: boolean;
  cliente: boolean;
  epico: boolean;
  sprint: boolean;
};

export const FIELD_LABELS: Record<keyof KanbanCardFields, string> = {
  prazo: "Prazo",
  criacao: "Data de criação",
  responsavel: "Responsável",
  prioridade: "Prioridade",
  estimativa: "Estimativa",
  subtarefas: "Subtarefas",
  projeto: "Projeto",
  cliente: "Cliente",
  epico: "Épico",
  sprint: "Sprint",
};

const DEFAULT_FIELDS: KanbanCardFields = {
  prazo: true,
  criacao: false,
  responsavel: true,
  prioridade: true,
  estimativa: true,
  subtarefas: true,
  projeto: true,
  cliente: true,
  epico: true,
  sprint: false,
};

const LS_KEY = "kanban-card-fields-v1";

export function useKanbanCardFields() {
  // Always initialize with DEFAULT_FIELDS to match SSR — sync from localStorage after hydration
  const [fields, setFields] = useState<KanbanCardFields>(DEFAULT_FIELDS);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(LS_KEY);
      if (stored) setFields({ ...DEFAULT_FIELDS, ...JSON.parse(stored) });
    } catch {}
  }, []);

  const toggle = useCallback((field: keyof KanbanCardFields) => {
    setFields((prev) => {
      const next = { ...prev, [field]: !prev[field] };
      try {
        localStorage.setItem(LS_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  return { fields, toggle };
}
