"use client";

import { useEffect } from "react";

const INTERVAL_MS = 2 * 60 * 1000; // 2 minutos

export function Heartbeat() {
  useEffect(() => {
    // Envia imediatamente ao montar
    fetch("/api/auth/heartbeat", { method: "POST" }).catch(() => {});

    const id = setInterval(() => {
      fetch("/api/auth/heartbeat", { method: "POST" }).catch(() => {});
    }, INTERVAL_MS);

    return () => clearInterval(id);
  }, []);

  return null;
}
