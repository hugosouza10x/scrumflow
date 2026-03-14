"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

export function NavigationProgress() {
  const pathname = usePathname();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();
  const startedRef = useRef(false);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const anchor = (e.target as Element).closest("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("http") || href.startsWith("mailto") || href === "#") return;
      if (href === pathname) return;
      startedRef.current = true;
      setProgress(15);
      setVisible(true);
      clearInterval(intervalRef.current);
      intervalRef.current = setInterval(() => {
        setProgress((p) => {
          if (p >= 80) return p;
          return p + Math.random() * 8;
        });
      }, 250);
    }
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [pathname]);

  useEffect(() => {
    if (!startedRef.current) return;
    clearInterval(intervalRef.current);
    setProgress(100);
    const timer = setTimeout(() => {
      setVisible(false);
      setProgress(0);
      startedRef.current = false;
    }, 400);
    return () => clearTimeout(timer);
  }, [pathname]);

  if (!visible) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[200] h-0.5 pointer-events-none">
      <div
        className="h-full bg-primary transition-all duration-300 ease-out"
        style={{ width: `${progress}%`, boxShadow: "0 0 8px hsl(var(--primary) / 0.7)" }}
      />
    </div>
  );
}
