import type { ReactNode } from "react";

export default function Card({
  title,
  action,
  children,
  className = "",
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-xl border border-line bg-surface p-5 shadow-sm ${className}`}
    >
      {(title || action) && (
        <header className="mb-4 flex items-center justify-between gap-3">
          {title && <h2 className="text-[15px] font-bold">{title}</h2>}
          {action}
        </header>
      )}
      {children}
    </section>
  );
}
