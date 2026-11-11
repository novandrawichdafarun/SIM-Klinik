import { NAMA_KLINIK } from "@/libs/klinik";
import type { InvoiceData } from "@/types/invoice";
import { formatDesimal, formatRupiah, formatTanggal } from "@/utils/format";

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-ink-3">{label}</dt>
      <dd className="mt-0.5 font-semibold">{value}</dd>
    </div>
  );
}

/** Tampilan dokumen invoice; dipakai admin (detail) dan pasien (halaman publik) */
export default function InvoiceKertas({ invoice: i }: { invoice: InvoiceData }) {
  return (
    <article className="rounded-xl border border-line bg-surface p-5 shadow-sm md:p-7">
      <header className="flex flex-col gap-3 border-b border-line pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-lg font-bold">{NAMA_KLINIK}</p>
          <p className="text-xs text-ink-3">Invoice layanan kesehatan</p>
        </div>
        <div className="sm:text-right">
          <p className="text-xs font-bold tracking-wide text-ink-3 uppercase">Invoice</p>
          <p className="text-lg font-bold tabular-nums">{i.nomorInvoice}</p>
          <p className="text-xs text-ink-3">{formatTanggal(i.tanggal)}</p>
        </div>
      </header>

      <dl className="grid grid-cols-2 gap-4 border-b border-line py-5 text-sm md:grid-cols-4">
        <Info label="Pasien" value={i.namaPasien} />
        <Info label="No. RM" value={i.NoRM} />
        <Info label="Kunjungan" value={`${i.kodeKunjungan} · ${formatTanggal(i.tglKunjungan)}`} />
        <Info label="Penjamin" value={i.jenisPenjamin} />
        <Info label="Poli" value={i.namaPoli} />
        <Info label="Dokter" value={i.namaDokter ?? "-"} />
        <Info label="Perawat" value={i.namaPerawat ?? "-"} />
      </dl>

      <div className="-mx-5 overflow-x-auto md:-mx-7">
        <table className="w-full min-w-120 border-collapse text-left text-sm">
          <thead className="text-[10px] font-bold tracking-wide text-ink-2 uppercase">
            <tr className="h-10 border-b border-line">
              <th className="pl-5 md:pl-7">Layanan</th>
              <th className="px-3 text-right">Tarif</th>
              <th className="px-3 text-right">Diskon</th>
              <th className="pr-5 text-right md:pr-7">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {i.items.map((it, idx) => (
              <tr key={idx} className="h-12 border-b border-line">
                <td className="pl-5 font-medium md:pl-7">{it.namaLayanan}</td>
                <td className="px-3 text-right tabular-nums">{formatRupiah(it.tarif)}</td>
                <td className="px-3 text-right tabular-nums text-ink-2">
                  {it.diskonPersen > 0
                    ? `${formatDesimal(it.diskonPersen, 0)}% (−${formatRupiah(it.potongan)})`
                    : "-"}
                </td>
                <td className="pr-5 text-right font-semibold tabular-nums md:pr-7">
                  {formatRupiah(it.subtotal)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <dl className="mt-4 ml-auto max-w-72 space-y-1.5 text-sm">
        <div className="flex justify-between">
          <dt className="text-ink-3">Subtotal</dt>
          <dd className="tabular-nums">{formatRupiah(i.subtotal)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-ink-3">Diskon</dt>
          <dd className="tabular-nums">−{formatRupiah(i.totalDiskon)}</dd>
        </div>
        <div className="flex justify-between border-t border-line pt-2 text-base font-bold">
          <dt>Total bayar</dt>
          <dd className="tabular-nums">{formatRupiah(i.totalBayar)}</dd>
        </div>
      </dl>
    </article>
  );
}
