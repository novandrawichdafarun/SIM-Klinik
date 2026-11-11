"use client";

import { toast } from "@/components/feedback/toast";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { CalendarDays, ChevronRight, FilePlus2, Star } from "lucide-react";
import { createInvoiceAction } from "@/actions/invoice";
import { SearchBox } from "@/components/rekap-pasien/RekapToolbar";
import type { InvoiceHarianData, KunjunganTagihan } from "@/types/invoice";
import { formatDesimal, formatHariTanggal, formatRupiah } from "@/utils/format";

function Tile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-4 shadow-sm md:p-5">
      <p className="text-xs text-ink-3">{label}</p>
      <p className="mt-1.5 text-2xl font-bold tracking-tight">{value}</p>
      {hint && <p className="mt-0.5 text-[11px] text-ink-3">{hint}</p>}
    </div>
  );
}

function StatusInvoice({ k }: { k: KunjunganTagihan }) {
  const [label, cls] = !k.idInvoice
    ? ["Belum dibuat", "bg-neutral-soft text-ink-2"]
    : k.statusKirim
      ? ["Terkirim", "bg-accent-soft text-accent-ink"]
      : ["Belum dikirim", "bg-warning-soft text-warning-ink"];
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${cls}`}>
      {label}
    </span>
  );
}

export default function InvoiceHarianView({ data, q }: { data: InvoiceHarianData; q: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [membuat, setMembuat] = useState<number | null>(null);
  const r = data.ringkasan;

  function gantiTanggal(value: string) {
    const next = new URLSearchParams(params.toString());
    next.set("tanggal", value);
    startTransition(() => router.replace(`${pathname}?${next.toString()}`, { scroll: false }));
  }

  async function buat(idKunjungan: number) {
    setMembuat(idKunjungan);
    const res = await createInvoiceAction(idKunjungan);
    if (res.success && res.data) {
      toast.success(res.message ?? "Invoice berhasil dibuat.");
      router.push(`/invoice-digital/${res.data.idInvoice}`);
    } else {
      toast.error(res.success ? "Gagal membuat invoice." : res.error);
      setMembuat(null);
    }
  }

  return (
    <>
      <div className="mb-5 grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
        <Tile label="Kunjungan selesai" value={String(r.kunjunganSelesai)} />
        <Tile label="Invoice dibuat" value={`${r.invoiceDibuat} / ${r.kunjunganSelesai}`} />
        <Tile label="Terkirim via WhatsApp" value={String(r.terkirim)} />
        <Tile
          label="Rating klinik"
          value={r.rataKlinik !== null ? `${formatDesimal(r.rataKlinik)} / 5` : "–"}
          hint={`${r.ratingMasuk} rating masuk hari ini · rata-rata 30 hari`}
        />
      </div>

      <section
        aria-busy={isPending}
        className={`overflow-hidden rounded-xl border border-line bg-surface shadow-sm transition-opacity ${
          isPending ? "opacity-60" : ""
        }`}
      >
        <div className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:p-5">
          <SearchBox q={q} placeholder="Cari pasien, No. RM, HP, atau no. invoice" />
          <label className="relative flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-line px-3 text-sm whitespace-nowrap hover:bg-surface-hover md:ml-auto">
            <CalendarDays aria-hidden="true" size={15} className="text-ink-3" />
            {formatHariTanggal(data.tanggal)}
            <span className="sr-only">Pilih tanggal kunjungan</span>
            <input
              type="date"
              value={data.tanggal}
              onChange={(e) => e.target.value && gantiTanggal(e.target.value)}
              onClick={(e) => e.currentTarget.showPicker?.()}
              className="absolute inset-0 cursor-pointer opacity-0"
            />
          </label>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-200 border-collapse text-left text-sm">
            <thead className="bg-surface-muted text-[10px] font-bold tracking-wide text-ink-2 uppercase">
              <tr className="h-10">
                <th className="pl-5">Jam</th>
                <th className="px-3">Pasien</th>
                <th className="px-3">Layanan</th>
                <th className="px-3">Dokter</th>
                <th className="px-3 text-right">Total</th>
                <th className="px-3">Invoice</th>
                <th className="px-3">Rating</th>
                <th className="pr-5 text-right">
                  <span className="sr-only">Aksi</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((k) => (
                <tr key={k.idKunjungan} className="h-14 border-t border-line">
                  <td className="pl-5 tabular-nums">{k.jam.replace(":", ".")}</td>
                  <td className="px-3">
                    <span className="font-semibold">{k.namaPasien}</span>
                    <span className="block text-xs text-ink-3">
                      {k.NoRM} · {k.noHp ?? "tanpa no. HP"}
                    </span>
                  </td>
                  <td className="max-w-56 px-3">
                    <span className="line-clamp-2">{k.namaLayanan}</span>
                  </td>
                  <td className="px-3">{k.namaDokter ?? "-"}</td>
                  <td className="px-3 text-right font-semibold tabular-nums">
                    {formatRupiah(k.total)}
                    {!k.idInvoice && (
                      <span className="block text-[11px] font-normal text-ink-3">perkiraan</span>
                    )}
                  </td>
                  <td className="px-3">
                    <StatusInvoice k={k} />
                    {k.nomorInvoice && (
                      <span className="block pt-0.5 text-xs text-ink-3">{k.nomorInvoice}</span>
                    )}
                  </td>
                  <td className="px-3">
                    {k.sudahRating ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-accent-ink">
                        <Star
                          aria-hidden="true"
                          size={13}
                          className="fill-amber-400 text-amber-400"
                        />
                        Sudah
                      </span>
                    ) : (
                      <span className="text-xs text-ink-3">Belum</span>
                    )}
                  </td>
                  <td className="pr-5 text-right">
                    {k.idInvoice ? (
                      <Link
                        href={`/invoice-digital/${k.idInvoice}`}
                        className="inline-flex h-9 items-center gap-1 rounded-lg border border-line px-3 text-sm font-semibold whitespace-nowrap hover:bg-surface-hover"
                      >
                        Lihat <ChevronRight aria-hidden="true" size={15} />
                      </Link>
                    ) : data.bisaBuat ? (
                      <button
                        type="button"
                        disabled={membuat !== null}
                        onClick={() => buat(k.idKunjungan)}
                        className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-emerald-500 px-3.5 text-sm font-semibold whitespace-nowrap text-white shadow-sm hover:bg-emerald-600 disabled:opacity-60"
                      >
                        <FilePlus2 aria-hidden="true" size={15} />
                        {membuat === k.idKunjungan ? "Membuat…" : "Buat Invoice"}
                      </button>
                    ) : (
                      <span className="text-xs text-ink-3">-</span>
                    )}
                  </td>
                </tr>
              ))}
              {data.items.length === 0 && (
                <tr>
                  <td colSpan={8} className="h-24 text-center text-sm text-ink-3">
                    {q
                      ? `Tidak ada kunjungan yang cocok dengan "${q}".`
                      : `Belum ada kunjungan selesai pada ${formatHariTanggal(data.tanggal)}.`}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
      <p className="mt-3 text-xs text-ink-3">
        Invoice dapat dibuat setelah dokter mengisi diagnosa (status kunjungan selesai).
      </p>
    </>
  );
}
