"use client";

import { toast } from "@/components/feedback/toast";
import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore, useTransition } from "react";
import { Check, Copy, ExternalLink, MessageCircle } from "lucide-react";
import { tandaiTerkirimAction } from "@/actions/invoice";
import Card from "@/components/ui/Card";
import { NAMA_KLINIK, nomorWhatsApp } from "@/libs/klinik";
import type { InvoiceData } from "@/types/invoice";
import { formatRupiah, formatTanggal, formatTanggalWaktu } from "@/utils/format";
import Bintang from "./Bintang";

function SalinTautan({ label, url }: { label: string; url: string }) {
  const [tersalin, setTersalin] = useState(false);
  return (
    <div>
      <p className="mb-1 text-xs font-semibold text-ink-2">{label}</p>
      <div className="flex gap-2">
        <input
          readOnly
          value={url}
          aria-label={label}
          onFocus={(e) => e.currentTarget.select()}
          className="h-9 min-w-0 flex-1 rounded-lg border border-line bg-surface-muted px-2.5 text-xs text-ink-2"
        />
        <button
          type="button"
          onClick={async () => {
            await navigator.clipboard.writeText(url);
            setTersalin(true);
            setTimeout(() => setTersalin(false), 1500);
          }}
          aria-label={`Salin ${label}`}
          className="grid size-9 shrink-0 place-items-center rounded-lg border border-line hover:bg-surface-hover"
        >
          {tersalin ? (
            <Check aria-hidden="true" size={15} />
          ) : (
            <Copy aria-hidden="true" size={15} />
          )}
        </button>
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          aria-label={`Buka ${label}`}
          className="grid size-9 shrink-0 place-items-center rounded-lg border border-line hover:bg-surface-hover"
        >
          <ExternalLink aria-hidden="true" size={15} />
        </a>
      </div>
    </div>
  );
}

const tanpaLangganan = () => () => {};

function pesanWhatsApp(i: InvoiceData, urlInvoice: string, urlRating: string) {
  return [
    `Halo ${i.namaPasien}, terima kasih telah berkunjung ke ${NAMA_KLINIK}.`,
    "",
    `Invoice ${i.nomorInvoice}`,
    `Tanggal kunjungan: ${formatTanggal(i.tglKunjungan)}`,
    `Total bayar: ${formatRupiah(i.totalBayar)}`,
    `Lihat invoice: ${urlInvoice}`,
    "",
    "Bantu kami meningkatkan pelayanan dengan memberi rating (bintang 1-5) untuk dokter, perawat, dan klinik:",
    urlRating,
  ].join("\n");
}

export default function KirimInvoicePanel({
  invoice: i,
  bisaKirim,
}: {
  invoice: InvoiceData;
  bisaKirim: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  // Tautan memakai alamat situs yang sedang dibuka (localhost saat pengembangan, domain saat online)
  const origin = useSyncExternalStore(
    tanpaLangganan,
    () => window.location.origin,
    () => "",
  );

  const urlInvoice = `${origin}/invoice-pasien/${i.token}`;
  const urlRating = `${origin}/rating/${i.token}`;
  const wa = nomorWhatsApp(i.noHp);

  function kirim() {
    if (!wa || !origin) return;
    const url = `https://wa.me/${wa}?text=${encodeURIComponent(pesanWhatsApp(i, urlInvoice, urlRating))}`;
    window.open(url, "_blank", "noopener,noreferrer");
    startTransition(async () => {
      const res = await tandaiTerkirimAction(i.idInvoice);
      if (!res.success) toast.error(res.error);
      else {
        toast.success("WhatsApp dibuka dan invoice ditandai terkirim.");
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-5">
      <Card title="Kirim ke Pasien">
        <dl className="mb-4 space-y-1.5 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-ink-3">No. WhatsApp</dt>
            <dd className="font-semibold">{i.noHp ?? "-"}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-ink-3">Status</dt>
            <dd className="font-semibold">
              {i.statusKirim ? `Terkirim · ${formatTanggalWaktu(i.waktuKirim)}` : "Belum dikirim"}
            </dd>
          </div>
        </dl>

        {bisaKirim && (
          <button
            type="button"
            onClick={kirim}
            disabled={!wa || !origin || isPending}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-emerald-500 text-sm font-semibold text-white shadow-sm hover:bg-emerald-600 disabled:opacity-50"
          >
            <MessageCircle aria-hidden="true" size={16} />
            {i.statusKirim ? "Kirim Ulang via WhatsApp" : "Kirim via WhatsApp"}
          </button>
        )}
        {!wa && (
          <p className="mt-2 text-xs text-ink-3">
            Nomor HP pasien kosong atau tidak valid. Perbarui data pasien, atau salin tautan di
            bawah dan kirim secara manual.
          </p>
        )}

        <div className="mt-5 space-y-3 border-t border-line pt-4">
          <SalinTautan label="Tautan invoice" url={urlInvoice} />
          <SalinTautan label="Tautan rating" url={urlRating} />
        </div>
      </Card>

      <Card title="Rating Pasien">
        {i.rating ? (
          <dl className="space-y-2.5 text-sm">
            <div className="flex items-center justify-between gap-3">
              <dt>Dokter{i.namaDokter ? ` · ${i.namaDokter}` : ""}</dt>
              <dd>
                <Bintang nilai={i.rating.nilaiDokter} />
              </dd>
            </div>
            {i.rating.nilaiPerawat !== null && (
              <div className="flex items-center justify-between gap-3">
                <dt>Perawat{i.namaPerawat ? ` · ${i.namaPerawat}` : ""}</dt>
                <dd>
                  <Bintang nilai={i.rating.nilaiPerawat} />
                </dd>
              </div>
            )}
            <div className="flex items-center justify-between gap-3">
              <dt>Klinik</dt>
              <dd>
                <Bintang nilai={i.rating.nilaiKlinik} />
              </dd>
            </div>
            {i.rating.ulasan && (
              <p className="rounded-lg bg-surface-muted p-3 text-ink-2">“{i.rating.ulasan}”</p>
            )}
            <p className="text-xs text-ink-3">Dikirim {formatTanggalWaktu(i.rating.createdAt)}</p>
          </dl>
        ) : (
          <p className="text-sm text-ink-3">Pasien belum memberikan rating.</p>
        )}
      </Card>
    </div>
  );
}
