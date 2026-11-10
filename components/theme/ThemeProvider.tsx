"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ReactNode } from "react";

/**
 * Tema terang/gelap via next-themes.
 * - attribute="class": menambah class "dark" di <html>, dipakai varian `dark:` Tailwind
 *   dan token warna di styles/globals.css.
 * - defaultTheme="system": ikut pengaturan OS sampai user memilih sendiri (tersimpan di localStorage).
 */
export default function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
