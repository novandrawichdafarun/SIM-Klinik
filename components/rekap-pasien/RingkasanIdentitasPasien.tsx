import { Pasien } from "@/types/rekap-pasien";
import { formatTanggal } from "@/utils/format";
import Avatar from "../ui/Avatar";

export default function RingkasanIdentitasPasien({
  pasien,
  usia,
  kelamin,
  isBpjs,
  ringkasDokter = false,
}: {
  pasien: Pasien;
  usia: number | null;
  kelamin: string;
  isBpjs: boolean;
  ringkasDokter?: boolean;
}) {
  const nikValid = /^\d{16}$/.test(pasien.NIK);
  const baris: [string, string][] = [
    ["No. RM", pasien.NoRM],
    ["NIK", pasien.NIK],
    ...(!ringkasDokter && nikValid
      ? [["Validasi Dukcapil", "Terverifikasi"] as [string, string]]
      : []),
    ...(!ringkasDokter
      ? [
          ["Terdaftar sejak", formatTanggal(pasien.createdAt)] as [
            string,
            string,
          ],
        ]
      : []),
    ...(ringkasDokter
      ? [["No. BPJS", pasien.noBpjs ?? "-"] as [string, string]]
      : []),
  ];

  return (
    <section className="rounded-xl border border-line bg-surface p-5 shadow-sm">
      <div className="flex items-center gap-4">
        <Avatar name={pasien.namaLengkap} size="lg" />
        <div className="min-w-0">
          <p className="text-sm font-semibold">
            {kelamin}
            {usia !== null && ` · ${usia} tahun`}
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <span className="rounded-full bg-avatar px-2 py-0.5 text-[11px] font-semibold text-avatar-ink">
              {isBpjs ? "BPJS" : pasien.jenisPenjamin}
            </span>
            {pasien.golonganDarah && (
              <span className="rounded-full bg-neutral-soft px-2 py-0.5 text-[11px] font-semibold text-ink-2">
                Gol. darah {pasien.golonganDarah}
              </span>
            )}
          </div>
        </div>
      </div>
      <dl className="mt-5 space-y-3 border-t border-line pt-4 text-sm">
        {baris.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-4">
            <dt className="text-ink-3">{label}</dt>
            <dd
              className={`text-right font-semibold tabular-nums ${
                label === "Validasi Dukcapil"
                  ? "rounded-full bg-accent-soft px-2 text-accent-ink"
                  : ""
              }`}
            >
              {value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
