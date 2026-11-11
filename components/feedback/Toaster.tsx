"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { CircleAlert, CircleCheck, Info, TriangleAlert, X } from "lucide-react";
import { ambilToast, langgananToast, tutupToast, type ToastItem, type ToastTipe } from "./toast";

const GAYA: Record<
  ToastTipe,
  { judul: string; ikon: typeof CircleCheck; warna: string; latarIkon: string }
> = {
  success: {
    judul: "Berhasil",
    ikon: CircleCheck,
    warna: "var(--primary)",
    latarIkon: "var(--success)",
  },
  error: { judul: "Gagal", ikon: CircleAlert, warna: "var(--danger)", latarIkon: "var(--danger)" },
  warning: {
    judul: "Perhatian",
    ikon: TriangleAlert,
    warna: "var(--warning)",
    latarIkon: "var(--warning)",
  },
  info: {
    judul: "Informasi",
    ikon: Info,
    warna: "var(--secondary)",
    latarIkon: "var(--secondary)",
  },
};

const kosong: ToastItem[] = [];

function KartuToast({ t }: { t: ToastItem }) {
  const g = GAYA[t.tipe];
  const Ikon = g.ikon;
  const [jeda, setJeda] = useState(false);
  const [keluar, setKeluar] = useState(false);
  const sisa = useRef(t.durasi ?? 0);
  const mulai = useRef(0);

  // Hitung mundur; berhenti saat kursor di atas toast / toast difokus
  useEffect(() => {
    if (t.durasi === null || jeda) return;
    mulai.current = Date.now();
    const timer = setTimeout(() => setKeluar(true), sisa.current);
    return () => {
      clearTimeout(timer);
      sisa.current -= Date.now() - mulai.current;
    };
  }, [jeda, t.durasi]);

  // Animasi keluar singkat sebelum dihapus
  useEffect(() => {
    if (!keluar) return;
    const timer = setTimeout(() => tutupToast(t.id), 180);
    return () => clearTimeout(timer);
  }, [keluar, t.id]);

  return (
    <li
      role={t.tipe === "error" ? "alert" : "status"}
      onMouseEnter={() => setJeda(true)}
      onMouseLeave={() => setJeda(false)}
      onFocus={() => setJeda(true)}
      onBlur={() => setJeda(false)}
      className={`pointer-events-auto relative flex w-full items-start gap-3 overflow-hidden rounded-xl border border-line bg-surface py-3.5 pr-10 pl-4 text-ink shadow-high ${
        keluar ? "animate-toast-keluar" : "animate-toast-masuk"
      }`}
      style={{ borderLeft: `4px solid ${g.warna}` }}
    >
      <span
        className="grid size-8 shrink-0 place-items-center rounded-full text-[#120b24]"
        style={{ background: g.latarIkon }}
      >
        <Ikon aria-hidden="true" size={17} strokeWidth={2.4} />
      </span>
      <div className="min-w-0 flex-1 pt-0.5">
        <p className="text-sm font-bold">{t.judul ?? g.judul}</p>
        <p className="mt-0.5 text-sm break-words text-ink-2">{t.pesan}</p>
      </div>
      <button
        type="button"
        onClick={() => setKeluar(true)}
        aria-label="Tutup notifikasi"
        className="absolute top-2.5 right-2.5 grid size-7 place-items-center rounded-md text-ink-3 hover:bg-surface-hover hover:text-ink"
      >
        <X aria-hidden="true" size={15} />
      </button>
      {t.durasi !== null && (
        <span
          aria-hidden="true"
          className="absolute bottom-0 left-0 h-0.75 animate-toast-progres"
          style={{
            background: g.warna,
            animationDuration: `${t.durasi}ms`,
            animationPlayState: jeda ? "paused" : "running",
          }}
        />
      )}
    </li>
  );
}

/** Tumpukan toast: kanan atas di desktop, atas-tengah di ponsel. Dipasang sekali di root layout. */
export default function Toaster() {
  const daftar = useSyncExternalStore(langgananToast, ambilToast, () => kosong);
  return (
    <ol
      aria-label="Notifikasi"
      className="pointer-events-none fixed inset-x-0 top-3 z-[100] mx-auto flex w-[calc(100%-1.5rem)] max-w-sm flex-col gap-2.5 sm:inset-x-auto sm:top-5 sm:right-5 sm:mx-0 sm:w-96"
    >
      {daftar.map((t) => (
        <KartuToast key={t.id} t={t} />
      ))}
    </ol>
  );
}
