import { RiwayatPenanganan } from "@/types/rekap-pasien";
import { formatTanggal } from "@/utils/format";

export default function DetailKunjungan({
  kunjungan,
}: {
  kunjungan: RiwayatPenanganan;
}) {
  const vital = [
    [
      "Tekanan darah",
      kunjungan.tekananDarah ? `${kunjungan.tekananDarah} mmHg` : "-",
    ],
    ["Suhu", kunjungan.suhu === null ? "-" : `${kunjungan.suhu} C`],
    ["Nadi", kunjungan.nadi === null ? "-" : `${kunjungan.nadi} x/menit`],
    [
      "Laju napas",
      kunjungan.lajuNapas === null ? "-" : `${kunjungan.lajuNapas} x/menit`,
    ],
  ];
  const rincian = [
    ["Keluhan", kunjungan.keluhan],
    ["Diagnosa", kunjungan.diagnosa],
    ["Resep", kunjungan.resepObat],
    ["Catatan dokter", kunjungan.catatanDokter],
  ] as const;

  return (
    <section className="rounded-xl border border-line bg-surface p-5 shadow-sm">
      <h2 className="text-[15px] font-bold">
        {formatTanggal(kunjungan.tanggal)} · {kunjungan.namaPoli}
      </h2>
      <p className="mt-1 text-xs text-ink-3">{kunjungan.kodeKunjungan}</p>
      <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {vital.map(([label, value]) => (
          <div key={label} className="rounded-lg bg-surface-muted p-3">
            <dt className="text-xs text-ink-3">{label}</dt>
            <dd className="mt-1 text-sm font-semibold">{value}</dd>
          </div>
        ))}
      </dl>
      <dl className="mt-4 grid gap-4 sm:grid-cols-2">
        {rincian.map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs text-ink-3">{label}</dt>
            <dd className="mt-1 text-sm font-medium wrap-break-words whitespace-pre-wrap">
              {value || "-"}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
