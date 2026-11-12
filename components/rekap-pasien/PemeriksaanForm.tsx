"use client";

import Link from "next/link";
import { startTransition, useActionState, useEffect, useMemo, useState } from "react";
import { Lock, Plus, Search, Trash2, X } from "lucide-react";
import { simpanDiagnosaAction, simpanPemeriksaanAction } from "@/actions/rekap-pasien";
import { toast } from "@/components/feedback/toast";
import { useFeedbackAksi } from "@/components/feedback/useFeedbackAksi";
import type { ActionResponse } from "@/types/action";
import type { ItemDiagnosa, PemeriksaanData, TindakanOption } from "@/types/rekap-pasien";
import { formatTanggal } from "@/utils/format";
import { Field, inputCls, textareaCls, UnitInput } from "./FormBits";

type Tab = "pemeriksaan" | "diagnosa";
type Vital = Omit<PemeriksaanData["pemeriksaan"], "layanan">;
type DraftItem = ItemDiagnosa & { hargaInput: string };
type ItemFieldError = Partial<Record<"nama" | "jumlah" | "satuan" | "hargaSatuan", string>>;
type DiagnosisErrors = {
  diagnosa?: string;
  catatanDokter?: string;
  obat: ItemFieldError[];
  suntik: ItemFieldError[];
};

const formatRupiah = (value: number) =>
  `Rp ${new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(value)}`;

const formatHargaInput = (value: number) =>
  new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(value);

function parseHargaInput(value: string): number {
  const angka = value.replace(/[^\d]/g, "");
  return angka ? Number(angka) : Number.NaN;
}

function draftItems(items: ItemDiagnosa[]): DraftItem[] {
  return items.map((item) => ({ ...item, hargaInput: formatHargaInput(item.hargaSatuan) }));
}

function hitungTotalItems(items: DraftItem[]): number {
  return items.reduce((total, item) => {
    const harga = parseHargaInput(item.hargaInput);
    const subtotal = Number(item.jumlah) * harga;
    return total + (Number.isFinite(subtotal) ? subtotal : 0);
  }, 0);
}

/* ------------------------------------------------------------------ */
/* Pencarian & daftar layanan / tindakan                              */
/* ------------------------------------------------------------------ */

function LayananPicker({
  options,
  selected,
  onChange,
  namaPoli,
  disabled,
}: {
  options: TindakanOption[];
  selected: number[];
  onChange: (ids: number[]) => void;
  namaPoli: string;
  disabled: boolean;
}) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const byId = useMemo(() => new Map(options.map((o) => [o.idLayanan, o])), [options]);
  const hasil = options.filter(
    (o) =>
      !selected.includes(o.idLayanan) &&
      `${o.namaLayanan} ${o.kodeLayanan} ${o.kategori}`
        .toLowerCase()
        .includes(q.trim().toLowerCase()),
  );

  function tambah(id: number) {
    onChange([...selected, id]);
    setQ("");
  }

  return (
    <div>
      <label htmlFor="cariLayanan" className="mb-1 block text-xs font-semibold text-ink-2">
        Tambah layanan<span className="text-danger-ink"> *</span>
      </label>
      <div className="relative">
        <Search
          aria-hidden="true"
          size={16}
          className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-3"
        />
        <input
          id="cariLayanan"
          role="combobox"
          aria-expanded={open && hasil.length > 0}
          aria-controls="hasil-layanan"
          autoComplete="off"
          disabled={disabled}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (hasil[0]) tambah(hasil[0].idLayanan);
            }
            if (e.key === "Escape") setOpen(false);
          }}
          placeholder={`Cari layanan ${namaPoli}`}
          className={`${inputCls} pl-9 disabled:bg-surface-muted`}
        />
        {open && hasil.length > 0 && (
          <ul
            id="hasil-layanan"
            role="listbox"
            className="absolute inset-x-0 top-full z-20 mt-1 max-h-64 overflow-y-auto rounded-lg border border-line bg-surface py-1 shadow-mid"
          >
            {hasil.map((o) => (
              <li
                key={o.idLayanan}
                role="option"
                aria-selected={false}
                // onMouseDown supaya terpilih sebelum input kehilangan fokus
                onMouseDown={(e) => {
                  e.preventDefault();
                  tambah(o.idLayanan);
                }}
                className="cursor-pointer px-3 py-2 hover:bg-surface-hover"
              >
                <span className="block text-sm font-semibold">{o.namaLayanan}</span>
                <span className="block text-xs text-ink-3">
                  {o.kodeLayanan} · {o.kategori}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <ul className="mt-3 space-y-2">
        {selected.map((id) => {
          const o = byId.get(id);
          return (
            <li
              key={id}
              className="flex items-center gap-3 rounded-lg border border-line px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">
                  {o?.namaLayanan ?? `Layanan #${id} (nonaktif)`}
                </p>
                {o && (
                  <p className="text-xs text-ink-3">
                    {o.kodeLayanan} · {o.kategori}
                  </p>
                )}
              </div>
              <button
                type="button"
                disabled={disabled}
                onClick={() => onChange(selected.filter((x) => x !== id))}
                aria-label={`Hapus ${o?.namaLayanan ?? "layanan"}`}
                className="grid size-9 shrink-0 place-items-center rounded-lg border border-line hover:bg-surface-hover disabled:opacity-40"
              >
                <X aria-hidden="true" size={16} />
              </button>
            </li>
          );
        })}
        {selected.length === 0 && (
          <li className="rounded-lg border border-dashed border-line px-4 py-3 text-sm text-ink-3">
            Belum ada layanan. Cari dan pilih layanan yang dilakukan.
          </li>
        )}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Halaman                                                            */
/* ------------------------------------------------------------------ */

export default function PemeriksaanForm({ tabAwal, ...d }: PemeriksaanData & { tabAwal?: Tab }) {
  const k = d.kunjungan;
  // Tab Diagnosa hanya bisa dibuka langsung oleh dokter
  const [tab, setTab] = useState<Tab>(
    tabAwal === "diagnosa" || d.peran === "readonly" ? "diagnosa" : "pemeriksaan",
  );
  const [vital, setVital] = useState<Vital>(() => ({
    tekananDarah: d.pemeriksaan.tekananDarah,
    suhu: d.pemeriksaan.suhu,
    nadi: d.pemeriksaan.nadi,
    lajuNapas: d.pemeriksaan.lajuNapas,
    beratBadan: d.pemeriksaan.beratBadan,
    tinggiBadan: d.pemeriksaan.tinggiBadan,
    keluhan: d.pemeriksaan.keluhan,
  }));
  const [layanan, setLayanan] = useState<number[]>(d.diagnosa.layanan);
  const [diag, setDiag] = useState(d.diagnosa);
  const [obat, setObat] = useState<DraftItem[]>(() => draftItems(d.diagnosa.obat));
  const [suntik, setSuntik] = useState<DraftItem[]>(() => draftItems(d.diagnosa.suntik));
  const [diagnosisErrors, setDiagnosisErrors] = useState<DiagnosisErrors>({
    obat: [],
    suntik: [],
  });

  const [pState, pAction, pPending] = useActionState<ActionResponse | null, FormData>(
    simpanPemeriksaanAction.bind(null, k.idKunjungan),
    null,
  );
  const [dState, dAction, dPending] = useActionState<ActionResponse | null, FormData>(
    simpanDiagnosaAction.bind(null, k.idKunjungan),
    null,
  );
  useFeedbackAksi(dState);
  // Hasil simpan pemeriksaan; dokter diarahkan ke tab Diagnosa
  const peran = d.peran;
  useEffect(() => {
    if (!pState) return;
    if (!pState.success) toast.error(pState.error);
    else
      toast.success(
        `${pState.message ?? "Pemeriksaan berhasil disimpan."}${peran === "dokter" ? " Lanjutkan ke tab Diagnosa." : ""}`,
      );
  }, [pState, peran]);

  const setV =
    (key: keyof Vital) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setVital((prev) => ({ ...prev, [key]: e.target.value }));
  const poliPendek = k.namaPoli.replace(/^Poli\s+/i, "");
  const kembali = `/rekap-pasien?tanggal=${k.tanggal}`;
  const terkunciPemeriksaan = !d.bisaUbahPemeriksaan;

  const vitalInput = (
    key: keyof Vital,
    label: string,
    unit: string,
    mode: "decimal" | "numeric" | "text",
  ) => (
    <Field label={label} htmlFor={key}>
      <UnitInput
        id={key}
        name={key}
        value={vital[key]}
        onChange={setV(key)}
        inputMode={mode}
        unit={unit}
        disabled={terkunciPemeriksaan}
      />
    </Field>
  );

  const submitManual =
    (action: (fd: FormData) => void) => (e: React.FormEvent<HTMLFormElement>) => {
      // Submit manual supaya React tidak me-reset isian saat server mengembalikan error
      e.preventDefault();
      const fd = new FormData(e.currentTarget);
      startTransition(() => action(fd));
    };

  const totalObat = useMemo(() => hitungTotalItems(obat), [obat]);
  const totalSuntik = useMemo(() => hitungTotalItems(suntik), [suntik]);
  const totalBiaya = (d.biayaPemeriksaan?.biaya ?? 0) + totalObat + totalSuntik;
  const updateItem = (
    kategori: "obat" | "suntik",
    index: number,
    patch: Partial<DraftItem>,
  ) => {
    const update = (items: DraftItem[]) =>
      items.map((item, i) => (i === index ? { ...item, ...patch } : item));
    if (kategori === "obat") setObat(update);
    else setSuntik(update);
    setDiagnosisErrors((current) => ({ ...current, [kategori]: [] }));
  };
  const tambahItem = (kategori: "obat" | "suntik") => {
    const item: DraftItem = {
      nama: "",
      jumlah: 1,
      satuan: "",
      hargaSatuan: 0,
      hargaInput: "",
    };
    if (kategori === "obat") setObat((current) => [...current, item]);
    else setSuntik((current) => [...current, item]);
    setDiagnosisErrors((current) => ({ ...current, [kategori]: [] }));
  };
  const hapusItem = (kategori: "obat" | "suntik", index: number) => {
    if (kategori === "obat") setObat((current) => current.filter((_, i) => i !== index));
    else setSuntik((current) => current.filter((_, i) => i !== index));
    setDiagnosisErrors((current) => ({ ...current, [kategori]: [] }));
  };
  const validasiItem = (items: DraftItem[]): ItemFieldError[] => {
    const errors = items.map((item) => {
      const result: ItemFieldError = {};
      if (!item.nama.trim()) result.nama = "Nama wajib diisi.";
      else if (item.nama.trim().length > 100) result.nama = "Maksimal 100 karakter.";
      if (!Number.isFinite(Number(item.jumlah)) || Number(item.jumlah) <= 0) {
        result.jumlah = "Jumlah harus lebih dari 0.";
      } else if (Number(item.jumlah) > 10000) {
        result.jumlah = "Jumlah maksimal 10.000.";
      }
      if (!item.satuan.trim()) result.satuan = "Satuan wajib diisi.";
      else if (item.satuan.trim().length > 40) result.satuan = "Maksimal 40 karakter.";
      const harga = parseHargaInput(item.hargaInput);
      if (!Number.isFinite(harga) || harga < 0) result.hargaSatuan = "Harga tidak valid.";
      else if (harga > 999999999) result.hargaSatuan = "Harga terlalu besar.";
      return result;
    });
    if (items.length > 30 && errors[0]) {
      errors[0].nama = "Maksimal 30 item per kategori.";
    }
    const names = new Map<string, number>();
    items.forEach((item, index) => {
      const key = item.nama.trim().toLocaleLowerCase("id-ID");
      if (!key) return;
      if (names.has(key)) {
        const first = names.get(key)!;
        errors[index].nama = "Nama sama, gabungkan melalui jumlah.";
        errors[first].nama = "Nama sama, gabungkan melalui jumlah.";
      } else names.set(key, index);
    });
    return errors;
  };
  const submitDiagnosa = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const errors: DiagnosisErrors = {
      diagnosa: !diag.diagnosa.trim()
        ? "Diagnosa wajib diisi."
        : diag.diagnosa.trim().length > 255
          ? "Diagnosa maksimal 255 karakter."
          : undefined,
      catatanDokter:
        diag.catatanDokter.length > 5000 ? "Catatan dokter maksimal 5.000 karakter." : undefined,
      obat: validasiItem(obat),
      suntik: validasiItem(suntik),
    };
    setDiagnosisErrors(errors);
    const valid =
      !errors.diagnosa &&
      !errors.catatanDokter &&
      [...errors.obat, ...errors.suntik].every((item) => Object.keys(item).length === 0);
    if (!valid) return;
    const fd = new FormData(e.currentTarget);
    const kePayload = (items: DraftItem[]): ItemDiagnosa[] =>
      items.map(({ hargaInput, ...item }) => ({
        ...item,
        jumlah: Number(item.jumlah),
        hargaSatuan: parseHargaInput(hargaInput),
      }));
    fd.set("obat", JSON.stringify(kePayload(obat)));
    fd.set("suntik", JSON.stringify(kePayload(suntik)));
    startTransition(() => dAction(fd));
  };
  const kartuItem = (kategori: "obat" | "suntik", judul: string, items: DraftItem[]) => {
    const errors = diagnosisErrors[kategori];
    const readOnly = !d.bisaDiagnosa || d.peran !== "dokter";
    return (
      <section className="rounded-xl border border-line bg-surface p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-[17px] font-bold">{judul}</h2>
          {!readOnly && (
            <button
              type="button"
              onClick={() => tambahItem(kategori)}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-emerald-500 px-3 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-950/30"
            >
              <Plus aria-hidden="true" size={16} /> Tambah {judul}
            </button>
          )}
        </div>
        {items.length > 0 ? (
          <div className="space-y-3">
            <div className="hidden grid-cols-[minmax(0,2fr)_minmax(90px,0.8fr)_minmax(110px,1fr)_minmax(130px,1.2fr)_minmax(120px,1fr)_40px] gap-3 px-1 text-xs font-semibold text-ink-2 md:grid">
              <span>Nama {judul.toLowerCase()}</span>
              <span>Jumlah</span>
              <span>Satuan</span>
              <span>Harga satuan</span>
              <span>Subtotal</span>
              <span />
            </div>
            {items.map((item, index) => {
              const harga = parseHargaInput(item.hargaInput);
              const subtotal =
                Number.isFinite(harga) && Number.isFinite(Number(item.jumlah))
                  ? harga * Number(item.jumlah)
                  : 0;
              const error = errors[index] ?? {};
              const label = kategori === "obat" ? "obat" : "suntik";
              return (
                <div
                  key={`${kategori}-${index}`}
                  className="grid grid-cols-2 gap-3 rounded-lg border border-line p-3 md:grid-cols-[minmax(0,2fr)_minmax(90px,0.8fr)_minmax(110px,1fr)_minmax(130px,1.2fr)_minmax(120px,1fr)_40px] md:items-start md:border-0 md:p-0"
                >
                  <label className="col-span-2 text-xs font-semibold text-ink-2 md:col-span-1 md:font-normal">
                    <span className="mb-1 block md:sr-only">Nama {label}</span>
                    <input
                      value={item.nama}
                      maxLength={100}
                      disabled={readOnly}
                      onChange={(e) => updateItem(kategori, index, { nama: e.target.value })}
                      className={`${inputCls} ${error.nama ? "border-danger-ink" : ""}`}
                    />
                    {error.nama && <span className="mt-1 block text-xs text-danger-ink">{error.nama}</span>}
                  </label>
                  <label className="text-xs font-semibold text-ink-2 md:font-normal">
                    <span className="mb-1 block md:sr-only">Jumlah</span>
                    <input
                      type="number"
                      min="0.001"
                      max="10000"
                      step="any"
                      value={item.jumlah}
                      disabled={readOnly}
                      onChange={(e) => updateItem(kategori, index, { jumlah: Number(e.target.value) })}
                      className={`${inputCls} ${error.jumlah ? "border-danger-ink" : ""}`}
                    />
                    {error.jumlah && <span className="mt-1 block text-xs text-danger-ink">{error.jumlah}</span>}
                  </label>
                  <label className="text-xs font-semibold text-ink-2 md:font-normal">
                    <span className="mb-1 block md:sr-only">Satuan</span>
                    <input
                      value={item.satuan}
                      maxLength={40}
                      disabled={readOnly}
                      placeholder="Tablet / botol"
                      onChange={(e) => updateItem(kategori, index, { satuan: e.target.value })}
                      className={`${inputCls} ${error.satuan ? "border-danger-ink" : ""}`}
                    />
                    {error.satuan && <span className="mt-1 block text-xs text-danger-ink">{error.satuan}</span>}
                  </label>
                  <label className="col-span-2 text-xs font-semibold text-ink-2 md:col-span-1 md:font-normal">
                    <span className="mb-1 block md:sr-only">Harga satuan (Rp)</span>
                    <input
                      inputMode="numeric"
                      value={item.hargaInput}
                      disabled={readOnly}
                      placeholder="0"
                      onChange={(e) =>
                        updateItem(kategori, index, {
                          hargaInput: e.target.value.replace(/[^\d]/g, ""),
                        })
                      }
                      onBlur={() =>
                        updateItem(kategori, index, {
                          hargaInput:
                            item.hargaInput && Number.isFinite(parseHargaInput(item.hargaInput))
                              ? formatHargaInput(parseHargaInput(item.hargaInput))
                              : "",
                        })
                      }
                      className={`${inputCls} ${error.hargaSatuan ? "border-danger-ink" : ""}`}
                    />
                    {error.hargaSatuan && (
                      <span className="mt-1 block text-xs text-danger-ink">{error.hargaSatuan}</span>
                    )}
                  </label>
                  <div className="col-span-2 text-xs font-semibold text-ink-2 md:col-span-1 md:pt-3 md:font-normal">
                    <span className="mb-1 block md:hidden">Subtotal</span>
                    <span className="text-sm font-semibold text-ink">{formatRupiah(subtotal)}</span>
                  </div>
                  <div className="flex items-start justify-end md:pt-0.5">
                    {readOnly ? null : (
                      <button
                        type="button"
                        onClick={() => hapusItem(kategori, index)}
                        aria-label={`Hapus ${label} ${item.nama || index + 1}`}
                        className="grid size-9 place-items-center rounded-lg border border-line text-danger-ink hover:bg-surface-hover"
                      >
                        <Trash2 aria-hidden="true" size={16} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="rounded-lg border border-dashed border-line px-4 py-3 text-sm text-ink-3">
            Belum ada {judul.toLowerCase()} yang ditambahkan.
          </p>
        )}
        <div className="mt-4 flex justify-end border-t border-line pt-3 text-sm">
          <span className="mr-3 text-ink-2">Subtotal {judul.toLowerCase()}</span>
          <strong>{formatRupiah(kategori === "obat" ? totalObat : totalSuntik)}</strong>
        </div>
      </section>
    );
  };
  const ringkasanBiaya = (
    <section className="rounded-xl border border-line bg-surface p-5 shadow-sm">
      <h2 className="mb-4 text-[17px] font-bold">Ringkasan Biaya</h2>
      {d.errorBiayaPemeriksaan && (
        <p role="alert" className="mb-4 rounded-lg border border-danger-ink/30 bg-danger-soft p-3 text-sm text-danger-ink">
          {d.errorBiayaPemeriksaan}
        </p>
      )}
      {d.biayaPemeriksaan && (
        <div className="space-y-3 text-sm">
          <div className="flex flex-wrap justify-between gap-2">
            <span className="text-ink-2">
              Biaya pemeriksaan poli ({d.biayaPemeriksaan.namaLayanan})
              {d.biayaPemeriksaan.diskonPersen > 0 && (
                <span className="ml-1 text-xs text-emerald-700 dark:text-emerald-300">
                  (diskon {d.biayaPemeriksaan.diskonPersen}% dari {formatRupiah(d.biayaPemeriksaan.tarif)})
                </span>
              )}
            </span>
            <strong>{formatRupiah(d.biayaPemeriksaan.biaya)}</strong>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-ink-2">Total obat</span>
            <strong>{formatRupiah(totalObat)}</strong>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-ink-2">Total suntik</span>
            <strong>{formatRupiah(totalSuntik)}</strong>
          </div>
          <div className="flex justify-between gap-2 border-t border-line pt-3 text-base">
            <span className="font-bold">TOTAL</span>
            <strong className="text-lg">{formatRupiah(totalBiaya)}</strong>
          </div>
        </div>
      )}
    </section>
  );

  const tombol = (formId: string, label: string, pending: boolean, disabled: boolean) => (
    <>
      <Link
        href={kembali}
        className="flex h-11 flex-1 items-center justify-center rounded-lg border border-line bg-surface px-5 text-sm font-semibold hover:bg-surface-hover md:flex-none"
      >
        Batal
      </Link>
      <button
        type="submit"
        form={formId}
        disabled={pending || disabled}
        className="flex h-11 flex-[1.4] items-center justify-center rounded-lg bg-emerald-500 px-4 text-sm font-semibold whitespace-nowrap text-white shadow-sm hover:bg-emerald-600 disabled:opacity-50 md:flex-none md:px-5"
      >
        {pending ? "Menyimpan..." : label}
      </button>
    </>
  );

  return (
    <div className="pb-24 md:pb-0">
      {/* Ringkasan kunjungan */}
      <section className="rounded-xl border border-line bg-surface p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-10">
          <div className="border-b border-line pb-3 md:border-0 md:pb-0">
            <p className="text-[17px] font-bold">{k.namaPasien}</p>
            <p className="text-xs text-ink-3">{k.NoRM}</p>
          </div>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 md:flex md:gap-10">
            {[
              ["ID kunjungan", k.kodeKunjungan],
              ["Tanggal", `${formatTanggal(k.tanggal)}, ${k.jam.replace(":", ".")}`],
              ["Poli", poliPendek],
              ["Dokter", k.namaDokter ?? "-"],
              ["Perawat", k.namaPerawat ?? "-"],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-[11px] text-ink-3">{label}</dt>
                <dd className="text-sm font-semibold">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {d.terkunci && (
        <p className="mt-4 flex items-center gap-2 rounded-xl bg-neutral-soft p-3 text-sm text-ink-2">
          <Lock aria-hidden="true" size={15} /> Jasa kunjungan ini sudah diklaim, data pemeriksaan &
          diagnosa dikunci.
        </p>
      )}

      {/* Tab */}
      <div
        role="tablist"
        className="mt-6 mb-5 grid grid-cols-2 border-b border-line md:flex md:gap-6"
      >
        {(["pemeriksaan", "diagnosa"] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`-mb-px flex items-center justify-center gap-1.5 border-b-2 px-1 pb-2.5 text-sm font-semibold transition ${
              tab === t
                ? "border-emerald-500 text-ink"
                : "border-transparent text-ink-3 hover:text-ink"
            }`}
          >
            {t === "diagnosa" && d.peran !== "dokter" && <Lock aria-hidden="true" size={14} />}
            {t === "pemeriksaan" ? "Pemeriksaan" : "Diagnosa"}
          </button>
        ))}
      </div>

      {/* -------- Tab Pemeriksaan -------- */}
      <div hidden={tab !== "pemeriksaan"}>
        <form id="form-pemeriksaan" onSubmit={submitManual(pAction)} className="space-y-5">
          <section className="rounded-xl border border-line bg-surface p-5 shadow-sm">
            <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-[17px] font-bold">Pemeriksaan Fisik</h2>
              {d.namaPerawat && (
                <p className="text-xs text-ink-3">Diperiksa oleh {d.namaPerawat}</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
              {vitalInput("tekananDarah", "Tekanan darah", "mmHg", "text")}
              {vitalInput("suhu", "Suhu", "°C", "decimal")}
              {vitalInput("nadi", "Nadi", "x/menit", "numeric")}
              {vitalInput("lajuNapas", "Laju napas", "x/menit", "numeric")}
              {vitalInput("beratBadan", "Berat badan", "kg", "decimal")}
              {vitalInput("tinggiBadan", "Tinggi badan", "cm", "decimal")}
              <Field
                label="Keluhan dan temuan"
                htmlFor="keluhan"
                required
                className="col-span-2 md:col-span-3"
              >
                <textarea
                  id="keluhan"
                  name="keluhan"
                  rows={4}
                  required
                  maxLength={5000}
                  disabled={terkunciPemeriksaan}
                  value={vital.keluhan}
                  onChange={setV("keluhan")}
                  className={textareaCls}
                />
              </Field>
            </div>
          </section>
        </form>

        <div className="fixed inset-x-0 bottom-0 z-30 flex gap-3 border-t border-line bg-surface p-4 md:static md:mt-5 md:justify-end md:border-0 md:bg-transparent md:p-0">
          {d.peran === "readonly" ? (
            <Link
              href={kembali}
              className="flex h-11 flex-1 items-center justify-center rounded-lg border border-line bg-surface px-5 text-sm font-semibold hover:bg-surface-hover md:flex-none"
            >
              Kembali
            </Link>
          ) : (
            tombol("form-pemeriksaan", "Simpan Pemeriksaan", pPending, terkunciPemeriksaan)
          )}
        </div>
      </div>

      {/* -------- Tab Diagnosa -------- */}
      <div hidden={tab !== "diagnosa"}>
        {d.peran !== "dokter" ? (
          <div className="space-y-5">
            <section className="rounded-xl border border-line bg-surface p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <Lock aria-hidden="true" size={16} className="text-ink-3" />
                <h2 className="text-[17px] font-bold">Hasil Diagnosa (read-only)</h2>
              </div>
              <dl className="grid gap-4">
                <div>
                  <dt className="mb-1 text-xs font-semibold text-ink-2">Diagnosa utama</dt>
                  <dd className="text-sm">{diag.diagnosa || "-"}</dd>
                </div>
                <div>
                  <dt className="mb-1 text-xs font-semibold text-ink-2">Catatan dokter</dt>
                  <dd className="whitespace-pre-wrap text-sm">{diag.catatanDokter || "-"}</dd>
                </div>
                {diag.resepLama && (
                  <div>
                    <dt className="mb-1 text-xs font-semibold text-ink-2">Catatan resep lama</dt>
                    <dd className="whitespace-pre-wrap text-sm">{diag.resepLama}</dd>
                  </div>
                )}
              </dl>
            </section>
            {kartuItem("obat", "Obat", obat)}
            {kartuItem("suntik", "Suntik", suntik)}
            {ringkasanBiaya}
          </div>
        ) : (
          <>
            <form
              id="form-diagnosa"
              noValidate
              onSubmit={submitDiagnosa}
              className="space-y-5"
            >
              <section className="rounded-xl border border-line bg-surface p-5 shadow-sm">
                <h2 className="mb-1 text-[17px] font-bold">Layanan &amp; Tindakan</h2>
                <p className="mb-4 text-xs text-ink-3">
                  Layanan yang diberikan menjadi dasar invoice pasien serta jasa dokter &amp;
                  perawat.
                </p>
                <LayananPicker
                  options={d.layananOptions}
                  selected={layanan}
                  onChange={setLayanan}
                  namaPoli={k.namaPoli}
                  disabled={!d.bisaDiagnosa}
                />
                <input type="hidden" name="layanan" value={layanan.join(",")} />
              </section>
              <section className="rounded-xl border border-line bg-surface p-5 shadow-sm">
                <h2 className="mb-4 text-[17px] font-bold">Diagnosa</h2>
                <div className="grid gap-4">
                  <Field label="Diagnosa utama" htmlFor="diagnosa" required>
                    <input
                      id="diagnosa"
                      name="diagnosa"
                      type="text"
                      required
                      maxLength={255}
                      autoComplete="off"
                      placeholder="Tulis diagnosa, mis. ISPA (J06.9)"
                      disabled={!d.bisaDiagnosa}
                      value={diag.diagnosa}
                      onChange={(e) => {
                        setDiag((p) => ({ ...p, diagnosa: e.target.value }));
                        setDiagnosisErrors((p) => ({ ...p, diagnosa: undefined }));
                      }}
                      className={inputCls}
                    />
                    {diagnosisErrors.diagnosa && (
                      <span className="mt-1 block text-xs text-danger-ink">
                        {diagnosisErrors.diagnosa}
                      </span>
                    )}
                  </Field>
                  <Field label="Catatan dokter" htmlFor="catatanDokter">
                    <textarea
                      id="catatanDokter"
                      name="catatanDokter"
                      rows={4}
                      maxLength={5000}
                      disabled={!d.bisaDiagnosa}
                      value={diag.catatanDokter}
                      onChange={(e) => {
                        setDiag((p) => ({ ...p, catatanDokter: e.target.value }));
                        setDiagnosisErrors((p) => ({ ...p, catatanDokter: undefined }));
                      }}
                      className={textareaCls}
                    />
                    {diagnosisErrors.catatanDokter && (
                      <span className="mt-1 block text-xs text-danger-ink">
                        {diagnosisErrors.catatanDokter}
                      </span>
                    )}
                  </Field>
                </div>
              </section>
              {diag.resepLama && (
                <section className="rounded-xl border border-line bg-surface p-5 shadow-sm">
                  <h2 className="mb-2 text-[17px] font-bold">Catatan Resep Lama</h2>
                  <p className="whitespace-pre-wrap text-sm text-ink-2">{diag.resepLama}</p>
                </section>
              )}
              {kartuItem("obat", "Obat", obat)}
              {kartuItem("suntik", "Suntik", suntik)}
              {ringkasanBiaya}
            </form>
            <div className="fixed inset-x-0 bottom-0 z-30 flex gap-3 border-t border-line bg-surface p-4 md:static md:mt-5 md:justify-end md:border-0 md:bg-transparent md:p-0">
              {tombol(
                "form-diagnosa",
                "Simpan Diagnosa",
                dPending,
                !d.bisaDiagnosa || !d.biayaPemeriksaan,
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
