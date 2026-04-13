"use client";

import { useTheme } from "next-themes";
import { motion } from "framer-motion";
import { Sun, Moon } from "lucide-react";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="w-[52px] h-6" />;

  const isDark = resolvedTheme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="relative inline-flex w-[52px] h-6 items-center rounded-full border border-surface-border bg-surface-border/60 transition-colors hover:border-frc-blue/50 focus:outline-none"
      aria-label="Toggle theme"
    >
      <motion.div
        className="absolute inset-0 rounded-full"
        animate={{ backgroundColor: isDark ? "#1565C020" : "#FFD60020" }}
        transition={{ duration: 0.3 }}
      />
      <motion.div
        className="relative z-10 flex items-center justify-center w-5 h-5 rounded-full shadow-sm"
        animate={{
          x: isDark ? 2 : 28,
          backgroundColor: isDark ? "#1565C0" : "#FFD600",
          rotate: isDark ? 0 : 360,
        }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
      >
        {isDark
          ? <Moon size={11} className="text-white" />
          : <Sun size={11} className="text-gray-800" />
        }
      </motion.div>
    </button>
  );
}
