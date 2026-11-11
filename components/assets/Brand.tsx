import { BriefcaseMedical } from "lucide-react";


export default function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <a href="#" className="flex items-center gap-2.5 text-ink">
      <span className="grid size-9 place-items-center rounded-xl bg-emerald-500 text-white">
        <BriefcaseMedical size={21} />
      </span>
      <span>
        <strong className="block text-[15px] leading-4">
          {compact ? "KlinikPulse" : "KlinikPulse SIM"}
        </strong>
        <small className="mt-1 block text-[8px] font-bold tracking-[0.08em] text-accent-ink">
          SIM KEPEGAWAIAN
        </small>
      </span>
    </a>
  );
}
