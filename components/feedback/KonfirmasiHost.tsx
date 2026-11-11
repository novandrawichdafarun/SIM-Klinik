"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { CircleHelp, TriangleAlert, Trash2 } from "lucide-react";
import { ambilKonfirmasi, langgananKonfirmasi, type KonfirmasiAktif } from "./konfirmasi";

const GAYA = {
  bahaya: {
    ikon: Trash2,
    latar: "var(--danger)",
    tombol: "bg-danger text-[#120b24] hover:brightness-95",
  },
  peringatan: {
    ikon: TriangleAlert,
    latar: "var(--warning)",
    tombol: "bg-emerald-500 text-white hover:bg-emerald-600",
  },
  biasa: {
    ikon: CircleHelp,
    latar: "var(--success)",
    tombol: "bg-emerald-500 text-white hover:bg-emerald-600",
  },
} as const;

function Dialog({ k }: { k: KonfirmasiAktif }) {
  const g = GAYA[k.tipe ?? "biasa"];
  const Ikon = g.ikon;
  const batalRef = useRef<HTMLButtonElement>(null);
  const yaRef = useRef<HTMLButtonElement>(null);
  const sebelumnya = useRef<Element | null>(null);

  useEffect(() => {
    sebelumnya.current = document.activeElement;
    // Aksi berbahaya: fokus awal di "Batal" supaya Enter tidak langsung menghapus
    (k.tipe === "bahaya" ? batalRef : yaRef).current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") k.jawab(false);
      if (e.key === "Tab") {
        // Fokus tetap di dalam dialog
        const urut = [batalRef.current, yaRef.current].filter(Boolean) as HTMLElement[];
        const i = urut.indexOf(document.activeElement as HTMLElement);
        e.preventDefault();
        urut[(i + (e.shiftKey ? -1 : 1) + urut.length) % urut.length]?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      (sebelumnya.current as HTMLElement | null)?.focus?.();
    };
  }, [k]);

  return (
    <div className="fixed inset-0 z-[110] grid place-items-center p-4">
      <div
        aria-hidden="true"
        onClick={() => k.jawab(false)}
        className="animate-fade-masuk absolute inset-0 bg-[#120b24]/45 backdrop-blur-[2px]"
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="konfirmasi-judul"
        aria-describedby={k.pesan ? "konfirmasi-pesan" : undefined}
        className="animate-dialog-masuk relative w-full max-w-md rounded-2xl border border-line bg-surface p-6 text-ink shadow-high"
      >
        <span
          className="mb-4 grid size-12 place-items-center rounded-full text-[#120b24]"
          style={{ background: g.latar }}
        >
          <Ikon aria-hidden="true" size={22} strokeWidth={2.2} />
        </span>
        <h2 id="konfirmasi-judul" className="text-lg font-bold">
          {k.judul}
        </h2>
        {k.pesan && (
          <p id="konfirmasi-pesan" className="mt-1.5 text-sm whitespace-pre-line text-ink-2">
            {k.pesan}
          </p>
        )}
        <div className="mt-6 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
          <button
            ref={batalRef}
            type="button"
            onClick={() => k.jawab(false)}
            className="h-10 rounded-lg border border-line bg-surface px-5 text-sm font-semibold hover:bg-surface-hover"
          >
            {k.teksTidak ?? "Batal"}
          </button>
          <button
            ref={yaRef}
            type="button"
            onClick={() => k.jawab(true)}
            className={`h-10 rounded-lg px-5 text-sm font-semibold shadow-sm ${g.tombol}`}
          >
            {k.teksYa ?? "Ya, lanjutkan"}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Dipasang sekali di root layout */
export default function KonfirmasiHost() {
  const k = useSyncExternalStore(langgananKonfirmasi, ambilKonfirmasi, () => null);
  return k ? <Dialog key={k.judul + (k.pesan ?? "")} k={k} /> : null;
}
