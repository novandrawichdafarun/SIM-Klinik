import { HeartPulse } from "lucide-react";
import { NAMA_KLINIK } from "@/libs/klinik";

/** Kerangka halaman untuk pasien (tanpa login & tanpa sidebar) */
export default function PublikShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background font-sans text-ink">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-3xl items-center gap-2.5 px-4 py-3">
          <span className="grid size-9 place-items-center rounded-lg bg-emerald-500 text-white">
            <HeartPulse aria-hidden="true" size={18} />
          </span>
          <p className="font-bold">{NAMA_KLINIK}</p>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">{children}</main>
      <footer className="py-5 text-center text-xs text-ink-3">© 2026 {NAMA_KLINIK}</footer>
    </div>
  );
}
