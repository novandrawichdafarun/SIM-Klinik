import Link from "next/link";
import { ClipboardPlus, Clock } from "lucide-react";
import type { AntreanDiagnosa } from "@/types/rekap-pasien";
import { formatTanggal } from "@/utils/format";

/**
 * Daftar kunjungan dokter yang belum didiagnosa (tab "Pasien Saya").
 * Diagnosa bisa diisi setelah perawat menyimpan tab Pemeriksaan.
 */
export default function AntreanDiagnosaView({ items, q }: { items: AntreanDiagnosa[]; q: string }) {
  const siap = items.filter((i) => i.sudahDiperiksa).length;

  return (
    <section className="mb-5 overflow-hidden rounded-xl border border-line bg-surface shadow-sm">
      <div className="flex flex-wrap items-center gap-2 px-4 pt-4 pb-3 md:px-5">
        <h2 className="text-base font-semibold">Menunggu Diagnosa</h2>
        <span className="rounded-full bg-warning-soft px-2.5 py-0.5 text-[11px] font-semibold text-warning-ink">
          {items.length} pasien
        </span>
        {items.length > 0 && (
          <p className="text-xs text-ink-3 md:ml-auto">
            {siap} siap didiagnosa · {items.length - siap} menunggu pemeriksaan perawat
          </p>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-180 border-collapse text-left text-sm">
          <thead className="bg-surface-muted text-[10px] font-bold tracking-wide text-ink-2 uppercase">
            <tr className="h-10">
              <th className="pl-5">Tanggal</th>
              <th className="px-3">Pasien</th>
              <th className="px-3">Poli &amp; Perawat</th>
              <th className="px-3">ID Kunjungan</th>
              <th className="px-3">Pemeriksaan</th>
              <th className="pr-5 text-right">
                <span className="sr-only">Aksi</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((k) => (
              <tr
                key={k.idKunjungan}
                className={`h-13 border-t border-line ${k.sudahDiperiksa ? "bg-accent-soft/40" : ""}`}
              >
                <td className="pl-5 tabular-nums">
                  {formatTanggal(k.tanggal)}
                  <span className="block text-xs text-ink-3">{k.jam.replace(":", ".")}</span>
                </td>
                <td className="px-3">
                  <span className="font-semibold">{k.namaPasien}</span>
                  <span className="block text-xs text-ink-3">{k.NoRM}</span>
                </td>
                <td className="px-3">
                  {k.namaPoli}
                  <span className="block text-xs text-ink-3">
                    {k.namaPerawat ?? "Tanpa perawat"}
                  </span>
                </td>
                <td className="px-3 text-ink-3">{k.kodeKunjungan}</td>
                <td className="px-3">
                  {k.sudahDiperiksa ? (
                    <span className="inline-flex rounded-full bg-accent-soft px-2.5 py-0.5 text-[11px] font-semibold text-accent-ink">
                      Sudah diperiksa
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-neutral-soft px-2.5 py-0.5 text-[11px] font-semibold text-ink-2">
                      <Clock aria-hidden="true" size={11} /> Belum diperiksa
                    </span>
                  )}
                </td>
                <td className="pr-5 text-right">
                  <Link
                    href={`/rekap-pasien/kunjungan/${k.idKunjungan}/periksa${k.sudahDiperiksa ? "?tab=diagnosa" : ""}`}
                    className={`inline-flex h-9 items-center gap-1.5 rounded-lg px-4 text-sm font-semibold whitespace-nowrap ${
                      k.sudahDiperiksa
                        ? "bg-emerald-500 text-white shadow-sm hover:bg-emerald-600"
                        : "border border-line hover:bg-surface-hover"
                    }`}
                  >
                    <ClipboardPlus aria-hidden="true" size={15} />
                    {k.sudahDiperiksa ? "Isi Diagnosa" : "Lihat"}
                  </Link>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={6} className="h-20 text-center text-sm text-ink-3">
                  {q
                    ? `Tidak ada antrean yang cocok dengan "${q}".`
                    : "Tidak ada pasien yang menunggu diagnosa."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
