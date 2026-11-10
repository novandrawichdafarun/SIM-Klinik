import { getInitials } from "@/utils/format";

const SIZE = {
  sm: "size-8 text-[11px]",
  md: "size-9 text-xs",
  lg: "size-14 text-sm",
} as const;

export default function Avatar({
  name,
  size = "md",
}: {
  name: string | null | undefined;
  size?: keyof typeof SIZE;
}) {
  return (
    <span
      aria-hidden="true"
      className={`grid shrink-0 place-items-center rounded-full bg-avatar font-bold text-avatar-ink ${SIZE[size]}`}
    >
      {getInitials(name)}
    </span>
  );
}
