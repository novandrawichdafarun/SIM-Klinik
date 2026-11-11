"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { CalendarDays, ChevronRight, Plus, Stethoscope } from "lucide-react";
import type { AksesRekap, KunjunganItem, StatusKunjungan } from "@/types/rekap-pasien";
import { formatHariTanggal } from "@/utils/format";
import { SearchBox } from "./RekapToolbar";

const STATUS_LABEL: Record<StatusKunjungan, string> = {
  menunggu: "Menunggu",
  selesai: "Selesai",
  batal: "Batal",
};

export function StatusKunjunganBadge({ status }: { status: StatusKunjungan }) {
  const cls =
    status === "selesai"
      ? "bg-accent-soft text-accent-ink"
      : status === "menunggu"
        ? "bg-warning-soft text-warning-ink"
        : "bg-neutral-soft text-ink-2";
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${cls}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}

type Filter = "semua" | "menunggu" | "selesai";

export default function KunjunganView({
  tanggal,
  items,
  q,
  akses,
}: {
  tanggal: string;
  items: KunjunganItem[];
  q: string;
  akses: AksesRekap;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [filter, setFilter] = useState<Filter>("semua");
  const [isPending, startTransition] = useTransition();

  const jumlah = {
    semua: items.length,
    menunggu: items.filter((i) => i.status === "menunggu").length,
    selesai: items.filter((i) => i.status === "selesai").length,
  };
  const visible = useMemo(
    () => (filter === "semua" ? items : items.filter((i) => i.status === filter)),
    [items, filter],
  );

  function gantiTanggal(value: string) {
    const next = new URLSearchParams(params.toString());
    next.set("tanggal", value);
    startTransition(() => router.replace(`${pathname}?${next.toString()}`, { scroll: false }));
  }

  return (
    <section
      aria-busy={isPending}
      className={`overflow-hidden rounded-xl border border-line bg-surface shadow-sm transition-opacity ${
        isPending ? "opacity-60" : ""
      }`}
    >
      <div className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:p-5">
        <SearchBox q={q} placeholder="Cari nama, NIK, atau no. BPJS" />
        <div role="group" aria-label="Filter status" className="flex flex-wrap gap-2">
          {(["semua", "menunggu", "selesai"] as const).map((f) => (
            <button
              key={f}
              type="button"
              aria-pressed={filter === f}
              onClick={() => setFilter(f)}
              className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
                filter === f
                  ? "border-emerald-500 bg-accent-soft text-accent-ink"
                  : "border-line bg-surface hover:bg-surface-hover"
              }`}
            >
              {f === "semua" ? "Semua" : STATUS_LABEL[f]} {jumlah[f]}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3 md:ml-auto">
          {/* Teks tanggal yang terlihat; input date transparan di atasnya membuka kalender */}
          <label className="relative flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-line px-3 text-sm whitespace-nowrap hover:bg-surface-hover">
            <CalendarDays aria-hidden="true" size={15} className="text-ink-3" />
            {formatHariTanggal(tanggal)}
            <span className="sr-only">Pilih tanggal kunjungan</span>
            <input
              type="date"
              value={tanggal}
              onChange={(e) => e.target.value && gantiTanggal(e.target.value)}
              onClick={(e) => e.currentTarget.showPicker?.()}
              className="absolute inset-0 cursor-pointer opacity-0"
            />
          </label>
          {akses.bisaTambahPasien && (
            <Link
              href={`/rekap-pasien/kunjungan/tambah?tanggal=${tanggal}`}
              className="flex h-10 items-center gap-1.5 rounded-lg bg-emerald-500 px-4 text-sm font-semibold whitespace-nowrap text-white shadow-sm hover:bg-emerald-600"
            >
              <Plus aria-hidden="true" size={16} /> Daftarkan Kunjungan
            </Link>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-190 border-collapse text-left text-sm">
          <thead className="bg-surface-muted text-[10px] font-bold tracking-wide text-ink-2 uppercase">
            <tr className="h-10">
              <th className="pl-5">Jam</th>
              <th className="px-3">Pasien</th>
              <th className="px-3">No. RM</th>
              <th className="px-3">Poli &amp; Layanan</th>
              <th className="px-3">Dokter &amp; Perawat</th>
              <th className="px-3">ID Kunjungan</th>
              <th className="px-3">Status</th>
              <th className="pr-5 text-right">
                <span className="sr-only">Aksi</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {visible.map((k) => (
              <tr
                key={k.idKunjungan}
                className={`h-13 border-t border-line ${k.bisaPeriksa ? "bg-accent-soft/40" : ""}`}
              >
                <td className="pl-5 tabular-nums">{k.jam.replace(":", ".")}</td>
                <td className="px-3 font-semibold">{k.namaPasien}</td>
                <td className="px-3 text-ink-3">{k.NoRM}</td>
                <td className="px-3">
                  {k.namaPoli}
                  <span className="block text-xs text-ink-3">
                    {k.namaLayanan || "Layanan diisi dokter"}
                  </span>
                </td>
                <td className="px-3">
                  {k.namaDokter ?? "-"}
                  <span className="block text-xs text-ink-3">
                    {k.namaPerawat ?? "Tanpa perawat"}
                  </span>
                </td>
                <td className="px-3 text-ink-3">{k.kodeKunjungan}</td>
                <td className="px-3">
                  <StatusKunjunganBadge status={k.status} />
                </td>
                <td className="pr-5 text-right">
                  {k.bisaPeriksa ? (
                    <Link
                      href={`/rekap-pasien/kunjungan/${k.idKunjungan}/periksa`}
                      className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-emerald-500 px-4 text-sm font-semibold text-white shadow-sm hover:bg-emerald-600"
                    >
                      <Stethoscope aria-hidden="true" size={15} /> Periksa
                    </Link>
                  ) : (
                    <Link
                      href={`/rekap-pasien/pasien/${k.idPasien}`}
                      aria-label={`Lihat pasien ${k.namaPasien}`}
                      className="inline-grid size-8 place-items-center rounded-lg text-ink-2 hover:bg-surface-hover"
                    >
                      <ChevronRight aria-hidden="true" size={17} />
                    </Link>
                  )}
                </td>
              </tr>
            ))}
            {visible.length === 0 && (
              <tr>
                <td colSpan={8} className="h-24 text-center text-sm text-ink-3">
                  Tidak ada kunjungan pada {formatHariTanggal(tanggal)}.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
