import Link from "next/link";
import { ChevronRight } from "lucide-react";

export type Crumb = { label: string; href?: string };

export default function Breadcrumb({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-2 text-[11px] text-ink-2">
      <ol className="flex flex-wrap items-center gap-1">
        {items.map((item, i) => {
          const last = i === items.length - 1;
          return (
            <li key={`${item.label}-${i}`} className="flex items-center gap-1">
              {item.href && !last ? (
                <Link href={item.href} className="hover:text-accent-ink hover:underline">
                  {item.label}
                </Link>
              ) : (
                <span className={last ? "font-semibold text-ink" : undefined}>
                  {item.label}
                </span>
              )}
              {!last && <ChevronRight aria-hidden="true" size={12} />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
