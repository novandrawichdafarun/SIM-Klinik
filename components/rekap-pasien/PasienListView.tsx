import Link from "next/link";
import { ChevronRight, Lock, UserPlus } from "lucide-react";
import type { AksesRekap, PasienRingkas } from "@/types/rekap-pasien";
import { formatTanggal, maskNik } from "@/utils/format";
import { SearchBox } from "./RekapToolbar";

export default function PasienListView({
  items,
  q,
  akses,
  mode,
}: {
  items: PasienRingkas[];
  q: string;
  akses: AksesRekap;
  mode: "saya" | "semua";
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-line bg-surface shadow-sm">
      <div className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:p-5">
        <SearchBox q={q} placeholder="Cari nama, NIK, atau no. BPJS" />
        <div className="flex items-center gap-3 md:ml-auto">
          {mode === "saya" ? (
            <p className="flex items-center gap-1.5 text-xs text-ink-3">
              <Lock aria-hidden="true" size={13} /> Hanya pasien yang pernah Anda tangani
            </p>
          ) : (
            akses.bisaTambahPasien && (
              <Link
                href="/rekap-pasien/pasien/tambah"
                className="flex h-10 items-center gap-1.5 rounded-lg bg-emerald-500 px-4 text-sm font-semibold text-white shadow-sm hover:bg-emerald-600"
              >
                <UserPlus aria-hidden="true" size={16} /> Tambah Pasien
              </Link>
            )
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-180 border-collapse text-left text-sm">
          <thead className="bg-surface-muted text-[10px] font-bold tracking-wide text-ink-2 uppercase">
            <tr className="h-10">
              <th className="pl-5">Pasien</th>
              <th className="px-3">NIK</th>
              <th className="px-3">No. BPJS</th>
              <th className="px-3">Pemeriksaan terakhir</th>
              {akses.bisaLihatDiagnosa && <th className="px-3">Diagnosa terakhir</th>}
              <th className="pr-5">
                <span className="sr-only">Detail</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((p) => (
              <tr key={p.idPasien} className="h-14 border-t border-line">
                <td className="pl-5">
                  <Link
                    href={`/rekap-pasien/pasien/${p.idPasien}`}
                    className="font-semibold hover:text-accent-ink hover:underline"
                  >
                    {p.namaLengkap}
                  </Link>
                  <span className="block text-xs text-ink-3">{p.NoRM}</span>
                </td>
                <td className="px-3 text-ink-2 tabular-nums">{maskNik(p.NIK)}</td>
                <td className="px-3 tabular-nums">{p.noBpjs ?? "-"}</td>
                <td className="px-3">{formatTanggal(p.pemeriksaanTerakhir)}</td>
                {akses.bisaLihatDiagnosa && <td className="px-3">{p.diagnosaTerakhir ?? "-"}</td>}
                <td className="pr-5 text-right">
                  <Link
                    href={`/rekap-pasien/pasien/${p.idPasien}`}
                    aria-label={`Lihat pasien ${p.namaLengkap}`}
                    className="inline-grid size-8 place-items-center rounded-lg text-ink-2 hover:bg-surface-hover"
                  >
                    <ChevronRight aria-hidden="true" size={17} />
                  </Link>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={6} className="h-24 text-center text-sm text-ink-3">
                  {q
                    ? `Tidak ada pasien yang cocok dengan "${q}".`
                    : mode === "saya"
                      ? "Belum ada pasien yang Anda tangani."
                      : "Belum ada data pasien."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
