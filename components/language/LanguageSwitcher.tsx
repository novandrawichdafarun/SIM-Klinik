"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { Check, ChevronDown, Globe } from "lucide-react";
import { setLocale } from "@/actions/locale";
import { locales, type Locale } from "@/i18n/config";

const languages: Record<Locale, { name: string; code: string }> = {
  id: { name: "Indonesia", code: "ID" },
  en: { name: "English", code: "EN" },
};

export default function LanguageSwitcher() {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  // Tutup dropdown saat klik di luar atau menekan Escape
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  function choose(next: Locale) {
    setOpen(false);
    if (next === locale) return;
    startTransition(async () => {
      await setLocale(next);
      router.refresh();
    });
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={pending}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Ganti bahasa / Change language"
        className="inline-flex h-8 items-center gap-2 rounded-lg border border-line text-ink-2 px-3 text-sm font-medium transition-colors hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 disabled:opacity-60"
      >
        <Globe className="h-4 w-4" />
        <span className="hidden sm:inline">{languages[locale].name}</span>
        <span className="sm:hidden">{languages[locale].code}</span>
        <ChevronDown
          className={`h-4 w-4 opacity-60 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute right-0 z-50 mt-2 w-44 rounded-xl border border-line p-1 shadow-lg bg-surface"
        >
          {locales.map((l) => {
            const active = l === locale;
            return (
              <li key={l} role="option" aria-selected={active}>
                <button
                  type="button"
                  onClick={() => choose(l)}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-slate-100 dark:hover:bg-white/10 ${
                    active
                      ? "font-semibold text-emerald-700 dark:text-emerald-400"
                      : "text-slate-700 dark:text-slate-200"
                  }`}
                >
                  {languages[l].name}
                  {active && <Check className="h-4 w-4" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
