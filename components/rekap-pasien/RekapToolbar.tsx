"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Search } from "lucide-react";

/**
 * Kotak cari yang menyimpan kata kunci di URL (?q=) dengan debounce,
 * sehingga hasil diambil ulang oleh server component.
 */
export function SearchBox({ q, placeholder }: { q: string; placeholder: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [value, setValue] = useState(q);
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (value === q) return;
    const t = setTimeout(() => {
      const next = new URLSearchParams(params.toString());
      if (value.trim()) next.set("q", value.trim());
      else next.delete("q");
      startTransition(() => router.replace(`${pathname}?${next.toString()}`, { scroll: false }));
    }, 400);
    return () => clearTimeout(t);
  }, [value, q, params, pathname, router]);

  return (
    <label className="flex h-10 w-full items-center gap-2 rounded-lg border border-line bg-surface px-3 md:max-w-80">
      <Search aria-hidden="true" size={16} className="shrink-0 text-ink-3" />
      <span className="sr-only">{placeholder}</span>
      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-transparent text-sm outline-none placeholder:text-ink-3"
      />
    </label>
  );
}

export function TabLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  const router = useRouter();
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={() => router.push(href, { scroll: false })}
      className={`-mb-px border-b-2 px-1 pb-2.5 text-sm font-semibold transition ${
        active ? "border-emerald-500 text-ink" : "border-transparent text-ink-3 hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}
