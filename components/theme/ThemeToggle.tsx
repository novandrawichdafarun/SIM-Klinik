"use client";

import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";

/**
 * Tombol ganti tema terang ↔ gelap.
 * Ikon dipilih lewat CSS (`dark:`), bukan state, sehingga tidak ada
 * hydration mismatch walau tema baru diketahui di browser.
 */
export default function ThemeToggle({ className = "" }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      aria-label="Ganti tema terang / gelap"
      title="Ganti tema terang / gelap"
      className={`grid size-8 place-items-center rounded-lg border border-line text-ink-2 transition hover:bg-surface-hover ${className}`}
    >
      <Moon aria-hidden="true" size={16} className="dark:hidden" />
      <Sun aria-hidden="true" size={16} className="hidden dark:block" />
    </button>
  );
}
