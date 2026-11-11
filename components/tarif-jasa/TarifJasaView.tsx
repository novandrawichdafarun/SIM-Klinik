"use client";

import { toast } from "@/components/feedback/toast";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Info, Pencil, Search, X } from "lucide-react";
import { setPembagianJasaAction } from "@/actions/tarif-jasa";
import type { TarifJasaPageData, TarifLayanan } from "@/types/jasa";
import { formatDesimal, formatRupiah, formatTanggal } from "@/utils/format";

const POLI_FILTERS = ["Semua", "Poli Umum", "Poli Gigi"] as const;
type PoliFilter = (typeof POLI_FILTERS)[number];

const fmtPersen = (n: number) => (Number.isInteger(n) ? `${n}%` : `${formatDesimal(n, 2)}%`);
const nominal = (biaya: number, persen: number) => Math.round((biaya * persen) / 100);

/** Sel "persentase · nominal" di tabel */
function Bagian({
  persen,
  biaya,
  muted = false,
}: {
  persen: number | null;
  biaya: number;
  muted?: boolean;
}) {
  if (persen === null) return <span className="text-xs text-ink-3">Belum diatur</span>;
  return (
    <div>
      <span
        className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
          muted ? "bg-neutral-soft text-ink-2" : "bg-avatar text-avatar-ink"
        }`}
      >
        {fmtPersen(persen)}
      </span>
      <span className="mt-1 block text-xs text-ink-3 tabular-nums">
        {formatRupiah(nominal(biaya, persen))}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Dialog pembagian persentase                                         */
/* ------------------------------------------------------------------ */

function PembagianDialog({
  layanan: l,
  onClose,
  onSaved,
}: {
  layanan: TarifLayanan;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [dokter, setDokter] = useState(l.persenDokter !== null ? String(l.persenDokter) : "");
  const [perawat, setPerawat] = useState(l.persenPerawat !== null ? String(l.persenPerawat) : "");
  const [isSaving, startSaving] = useTransition();

  const pDokter = Number(dokter.replace(",", ".")) || 0;
  const pPerawat = Number(perawat.replace(",", ".")) || 0;
  const pKlinik = Math.round((100 - pDokter - pPerawat) * 100) / 100;
  const lebih = pKlinik < 0;

  // Tutup dengan Escape & fokus ke input pertama
  useEffect(() => {
    dialogRef.current?.querySelector("input")?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function simpan(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startSaving(async () => {
      const res = await setPembagianJasaAction(fd);
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      onSaved(res.message ?? "Pembagian jasa berhasil disimpan.");
    });
  }

  const inputPersen = (id: string, label: string, value: string, onChange: (v: string) => void) => (
    <div>
      <label htmlFor={id} className="mb-1 block text-xs font-semibold text-ink-2">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          name={id}
          type="number"
          inputMode="decimal"
          min={0}
          max={100}
          step="0.01"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="0"
          className="h-11 w-full rounded-lg border border-line bg-surface pr-8 pl-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
        />
        <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-ink-3">
          %
        </span>
      </div>
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/50 px-4"
      onMouseDown={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="judul-pembagian"
        onMouseDown={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-xl border border-line bg-surface shadow-high"
      >
        <header className="flex items-start justify-between gap-3 border-b border-line p-5">
          <div>
            <h2 id="judul-pembagian" className="text-[17px] font-bold">
              Pembagian Jasa · {l.namaLayanan}
            </h2>
            <p className="mt-0.5 text-xs text-ink-3">
              {l.kodeLayanan} · {l.namaPoli} · Biaya {formatRupiah(l.biaya)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="grid size-8 place-items-center rounded-lg hover:bg-surface-hover"
          >
            <X aria-hidden="true" size={18} />
          </button>
        </header>

        <form onSubmit={simpan} className="space-y-4 p-5">
          <input type="hidden" name="idLayanan" value={l.idLayanan} />
          <div className="grid grid-cols-2 gap-3">
            {inputPersen("persenDokter", "Persentase dokter", dokter, setDokter)}
            {inputPersen("persenPerawat", "Persentase perawat", perawat, setPerawat)}
          </div>

          {/* Rincian pembagian biaya */}
          <dl className="divide-y divide-line rounded-lg border border-line text-sm">
            {[
              ["Jasa dokter", pDokter],
              ["Jasa perawat", pPerawat],
            ].map(([label, p]) => (
              <div key={label as string} className="flex justify-between px-4 py-2.5">
                <dt className="text-ink-2">
                  {label} ({fmtPersen(p as number)})
                </dt>
                <dd className="font-semibold tabular-nums">
                  {formatRupiah(nominal(l.biaya, p as number))}
                </dd>
              </div>
            ))}
            <div
              className={`flex justify-between px-4 py-2.5 ${lebih ? "bg-danger-soft" : "bg-surface-muted"}`}
            >
              <dt className={lebih ? "font-semibold text-danger-ink" : "font-semibold"}>
                Pemasukan klinik ({fmtPersen(pKlinik)})
              </dt>
              <dd className={`font-bold tabular-nums ${lebih ? "text-danger-ink" : ""}`}>
                {lebih
                  ? "—"
                  : formatRupiah(l.biaya - nominal(l.biaya, pDokter) - nominal(l.biaya, pPerawat))}
              </dd>
            </div>
          </dl>

          {lebih && (
            <p role="alert" className="text-xs font-semibold text-danger-ink">
              Total persentase dokter dan perawat melebihi 100%.
            </p>
          )}
          <p className="flex items-start gap-2 text-xs text-ink-3">
            <Info aria-hidden="true" size={14} className="mt-0.5 shrink-0" />
            Berlaku mulai hari ini. Tindakan sebelumnya tetap memakai tarif lamanya (tindakan yang
            belum punya tarif ikut memakai tarif ini); jasa perawat hanya diberikan bila pemeriksaan
            didampingi perawat (jika tidak, bagiannya masuk ke klinik).
          </p>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="h-10 rounded-lg border border-line px-4 text-sm font-semibold hover:bg-surface-hover"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSaving || lebih}
              className="h-10 rounded-lg bg-emerald-500 px-5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-600 disabled:opacity-50"
            >
              {isSaving ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Tabel layanan                                                        */
/* ------------------------------------------------------------------ */

export default function TarifJasaView({ layanan }: TarifJasaPageData) {
  const router = useRouter();
  const [poli, setPoli] = useState<PoliFilter>("Semua");
  const [query, setQuery] = useState("");
  const [dipilih, setDipilih] = useState<TarifLayanan | null>(null);
  const [, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return layanan.filter(
      (l) =>
        (poli === "Semua" || l.namaPoli === poli) &&
        (!q || `${l.namaLayanan} ${l.kodeLayanan}`.toLowerCase().includes(q)),
    );
  }, [layanan, poli, query]);

  const sudahDiatur = layanan.filter(
    (l) => l.persenDokter !== null || l.persenPerawat !== null,
  ).length;
  const klinik = (l: TarifLayanan) =>
    l.persenDokter === null && l.persenPerawat === null
      ? null
      : Math.round((100 - (l.persenDokter ?? 0) - (l.persenPerawat ?? 0)) * 100) / 100;

  const aksi = (l: TarifLayanan) => (
    <button
      type="button"
      onClick={() => {
        setDipilih(l);
      }}
      aria-label={`Atur pembagian jasa ${l.namaLayanan}`}
      title="Atur pembagian jasa"
      className="inline-grid size-8 place-items-center rounded-lg border border-line bg-surface hover:bg-surface-hover"
    >
      <Pencil aria-hidden="true" size={15} />
    </button>
  );

  return (
    <>
      <section className="overflow-hidden rounded-xl border border-line bg-surface shadow-sm">
        <div className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:p-5">
          <div>
            <h2 className="text-[17px] font-bold">Pembagian Jasa per Layanan</h2>
            <p className="text-xs text-ink-3">
              {sudahDiatur} dari {layanan.length} layanan sudah diatur · sisa persentase menjadi
              pemasukan klinik
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 md:ml-auto">
            <div role="group" aria-label="Filter poli" className="flex gap-2">
              {POLI_FILTERS.map((p) => (
                <button
                  key={p}
                  type="button"
                  aria-pressed={poli === p}
                  onClick={() => setPoli(p)}
                  className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
                    poli === p
                      ? "border-emerald-500 bg-accent-soft text-accent-ink"
                      : "border-line bg-surface hover:bg-surface-hover"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
            <label className="flex h-10 w-full items-center gap-2 rounded-lg border border-line bg-surface px-3 md:w-60">
              <Search aria-hidden="true" size={16} className="shrink-0 text-ink-3" />
              <span className="sr-only">Cari layanan</span>
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari layanan..."
                className="w-full bg-transparent text-sm outline-none placeholder:text-ink-3"
              />
            </label>
          </div>
        </div>

        {/* Desktop */}
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-220 border-collapse text-left text-sm">
            <thead className="bg-surface-muted text-[10px] font-bold tracking-wide text-ink-2 uppercase">
              <tr className="h-10">
                <th className="pl-5">Layanan</th>
                <th className="px-3">Poli</th>
                <th className="px-3">Biaya tindakan</th>
                <th className="px-3">Dokter</th>
                <th className="px-3">Perawat</th>
                <th className="px-3">Klinik (sisa)</th>
                <th className="px-3">Berlaku mulai</th>
                <th className="pr-5 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((l) => (
                <tr
                  key={l.idLayanan}
                  className={`h-16 border-t border-line ${dipilih?.idLayanan === l.idLayanan ? "bg-accent-soft/50" : ""}`}
                >
                  <td className="pl-5">
                    <span className="font-semibold">{l.namaLayanan}</span>
                    <span className="block text-xs text-ink-3">
                      {l.kodeLayanan}
                      {!l.aktif && " · nonaktif"}
                    </span>
                  </td>
                  <td className="px-3">{l.namaPoli}</td>
                  <td className="px-3 tabular-nums">{formatRupiah(l.biaya)}</td>
                  <td className="px-3">
                    <Bagian persen={l.persenDokter} biaya={l.biaya} />
                  </td>
                  <td className="px-3">
                    <Bagian persen={l.persenPerawat} biaya={l.biaya} />
                  </td>
                  <td className="px-3">
                    <Bagian persen={klinik(l)} biaya={l.biaya} muted />
                  </td>
                  <td className="px-3 text-ink-3">
                    {l.berlakuMulai ? formatTanggal(l.berlakuMulai) : "-"}
                  </td>
                  <td className="pr-5 text-center">{aksi(l)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile */}
        <ul className="divide-y divide-line border-t border-line md:hidden">
          {filtered.map((l) => {
            const k = klinik(l);
            return (
              <li key={l.idLayanan} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{l.namaLayanan}</p>
                  <p className="text-xs text-ink-3">
                    {l.namaPoli} · {formatRupiah(l.biaya)}
                  </p>
                  <p className="mt-1 text-xs text-ink-2">
                    {k === null
                      ? "Belum diatur"
                      : `Dokter ${fmtPersen(l.persenDokter ?? 0)} · Perawat ${fmtPersen(l.persenPerawat ?? 0)} · Klinik ${fmtPersen(k)}`}
                  </p>
                </div>
                {aksi(l)}
              </li>
            );
          })}
        </ul>

        {filtered.length === 0 && (
          <p className="px-5 py-8 text-center text-sm text-ink-3">
            {layanan.length === 0
              ? "Belum ada layanan. Tambahkan dulu di menu Katalog Layanan."
              : "Tidak ada layanan yang cocok dengan filter."}
          </p>
        )}
      </section>

      {dipilih && (
        <PembagianDialog
          key={dipilih.idLayanan}
          layanan={dipilih}
          onClose={() => setDipilih(null)}
          onSaved={(msg) => {
            setDipilih(null);
            toast.success(msg);
            startTransition(() => router.refresh());
          }}
        />
      )}
    </>
  );
}
