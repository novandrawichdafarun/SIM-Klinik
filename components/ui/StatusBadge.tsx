export default function StatusBadge({
  active,
  activeLabel = "Aktif",
  inactiveLabel = "Nonaktif",
}: {
  active: boolean;
  activeLabel?: string;
  inactiveLabel?: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
        active ? "bg-accent-soft text-accent-ink" : "bg-neutral-soft text-ink-2"
      }`}
    >
      {active ? activeLabel : inactiveLabel}
    </span>
  );
}
