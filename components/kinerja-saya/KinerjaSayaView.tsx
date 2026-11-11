import Link from "next/link";
import { ChevronRight } from "lucide-react";
import KinerjaStatistik from "@/components/karyawan/KinerjaStatistik";
import PeriodeSelect from "@/components/karyawan/PeriodeSelect";
import Avatar from "@/components/ui/Avatar";
import Card from "@/components/ui/Card";
import type { KinerjaSayaData } from "@/types/kinerja";
import { formatTanggal } from "@/utils/format";

export default function KinerjaSayaView({ data }: { data: KinerjaSayaData }) {
  const { rating, kinerja, periode, riwayat } = data;
  const dokter = data.jabatan === "dokter";
  const subtitle = [data.jenisKaryawan, data.namaPoli].filter(Boolean).join(" · ");

  return (
    <>
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-[25px] font-bold tracking-tight md:text-[28px]">Kinerja Saya</h1>
          <p className="mt-1 text-sm text-ink-3">
            {rating
              ? `Pasien yang Anda tangani dan penilaian pengunjung dalam ${periode.bulan} bulan terakhir.`
              : `Pasien yang Anda tangani dalam ${periode.bulan} bulan terakhir.`}
          </p>
        </div>
        <PeriodeSelect value={periode.bulan} />
      </div>

      <section className="mb-5 flex items-center gap-4 rounded-xl border border-line bg-surface p-5 shadow-sm">
        <Avatar name={data.namaLengkap} size="lg" />
        <div>
          <p className="font-semibold">{data.namaLengkap}</p>
          <p className="mt-0.5 text-sm text-ink-3">{subtitle || "-"}</p>
        </div>
      </section>

      <KinerjaStatistik rating={rating} kinerja={kinerja} />

      <Card title="Penanganan Terakhir" className="mt-5 overflow-hidden">
        {riwayat.length > 0 ? (
          <div className="-mx-5 -mb-5 overflow-x-auto">
            <table className="w-full min-w-170 border-collapse text-left text-sm">
              <thead className="bg-surface-muted text-[10px] font-bold tracking-wide text-ink-2 uppercase">
                <tr className="h-10">
                  <th className="pl-5">Tanggal</th>
                  <th className="px-3">Pasien</th>
                  <th className="px-3">Layanan</th>
                  <th className="px-3">Peran</th>
                  {dokter && <th className="px-3">Diagnosa</th>}
                  <th className="pr-5">
                    <span className="sr-only">Detail</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {riwayat.map((r) => (
                  <tr key={r.idKunjungan} className="h-14 border-t border-line">
                    <td className="pl-5 tabular-nums">
                      {formatTanggal(r.tanggal)}
                      <span className="block text-xs text-ink-3">{r.kodeKunjungan}</span>
                    </td>
                    <td className="px-3">
                      <span className="font-semibold">{r.namaPasien}</span>
                      <span className="block text-xs text-ink-3">{r.NoRM}</span>
                    </td>
                    <td className="px-3">
                      {r.namaLayanan}
                      <span className="block text-xs text-ink-3">{r.namaPoli}</span>
                    </td>
                    <td className="px-3">
                      <span className="inline-flex rounded-full bg-accent-soft px-2.5 py-0.5 text-[11px] font-semibold text-accent-ink">
                        {r.peran === "dokter" ? "Dokter" : "Perawat"}
                      </span>
                    </td>
                    {dokter && <td className="px-3">{r.diagnosa ?? "-"}</td>}
                    <td className="pr-5 text-right">
                      <Link
                        href={`/rekap-pasien/pasien/${r.idPasien}`}
                        aria-label={`Lihat pasien ${r.namaPasien}`}
                        className="inline-grid size-8 place-items-center rounded-lg text-ink-2 hover:bg-surface-hover"
                      >
                        <ChevronRight aria-hidden="true" size={17} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-ink-3">Belum ada pasien yang Anda tangani pada periode ini.</p>
        )}
      </Card>
    </>
  );
}
