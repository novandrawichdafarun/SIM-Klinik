"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";
import { CalendarDays, ChevronDown } from "lucide-react";

const OPTIONS = [
  { value: 3, label: "3 bulan terakhir" },
  { value: 6, label: "6 bulan terakhir" },
  { value: 12, label: "12 bulan terakhir" },
];

export default function PeriodeSelect({ value }: { value: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  return (
    <label
      className={`relative flex h-10 items-center gap-2 rounded-lg border border-line bg-surface pr-9 pl-3 text-sm font-medium shadow-sm ${
        isPending ? "opacity-60" : ""
      }`}
    >
      <CalendarDays aria-hidden="true" size={16} className="text-ink-2" />
      <span className="sr-only">Periode statistik</span>
      <select
        value={value}
        onChange={(e) =>
          startTransition(() =>
            router.replace(`${pathname}?periode=${e.target.value}`, { scroll: false }),
          )
        }
        className="cursor-pointer appearance-none bg-transparent outline-none"
      >
        {OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown aria-hidden="true" size={16} className="pointer-events-none absolute right-3" />
    </label>
  );
}
