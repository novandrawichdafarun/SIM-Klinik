import { Star } from "lucide-react";

/** Tampilan bintang 1-5 (baca saja) */
export default function Bintang({ nilai, size = 15 }: { nilai: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${nilai} dari 5 bintang`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          aria-hidden="true"
          size={size}
          className={i <= nilai ? "fill-amber-400 text-amber-400" : "text-ink-faint"}
        />
      ))}
    </span>
  );
}
