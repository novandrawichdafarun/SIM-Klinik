export default function Info({
  label,
  value,
  wide = false,
}: {
  label: string;
  value: string | null;
  wide?: boolean;
}) {
  return (
    <div className={wide ? "sm:col-span-3" : undefined}>
      <dt className="text-xs text-ink-3">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium wrap-break-words">
        {value || "-"}
      </dd>
    </div>
  );
}
