"use client";

import Link from "next/link";
import { startTransition, useActionState, useEffect, useMemo, useState } from "react";
import { Lock, Search, X } from "lucide-react";
import { simpanDiagnosaAction, simpanPemeriksaanAction } from "@/actions/rekap-pasien";
import { toast } from "@/components/feedback/toast";
import { useFeedbackAksi } from "@/components/feedback/useFeedbackAksi";
import type { ActionResponse } from "@/types/action";
import type { PemeriksaanData, TindakanOption } from "@/types/rekap-pasien";
import { formatTanggal } from "@/utils/format";
import { Field, inputCls, textareaCls, UnitInput } from "./FormBits";

type Tab = "pemeriksaan" | "diagnosa";
type Vital = Omit<PemeriksaanData["pemeriksaan"], "layanan">;

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
    tabAwal === "diagnosa" && d.peran === "dokter" ? "diagnosa" : "pemeriksaan",
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
          {tombol("form-pemeriksaan", "Simpan Pemeriksaan", pPending, terkunciPemeriksaan)}
        </div>
      </div>

      {/* -------- Tab Diagnosa -------- */}
      <div hidden={tab !== "diagnosa"}>
        {d.peran !== "dokter" ? (
          <section className="flex flex-col items-center gap-2 rounded-xl border border-line bg-surface p-10 text-center shadow-sm">
            <span className="grid size-12 place-items-center rounded-full bg-neutral-soft text-ink-2">
              <Lock aria-hidden="true" size={20} />
            </span>
            <h2 className="text-[17px] font-bold">Diagnosa hanya untuk dokter</h2>
            <p className="max-w-sm text-sm text-ink-3">
              Diagnosa diisi dan hanya dapat dilihat oleh dokter penanggung jawab
              {k.namaDokter ? ` (${k.namaDokter})` : ""}.
            </p>
          </section>
        ) : (
          <>
            <form id="form-diagnosa" onSubmit={submitManual(dAction)} className="space-y-5">
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
                      onChange={(e) => setDiag((p) => ({ ...p, diagnosa: e.target.value }))}
                      className={inputCls}
                    />
                  </Field>
                  <Field label="Catatan dokter" htmlFor="catatanDokter">
                    <textarea
                      id="catatanDokter"
                      name="catatanDokter"
                      rows={4}
                      maxLength={5000}
                      disabled={!d.bisaDiagnosa}
                      value={diag.catatanDokter}
                      onChange={(e) => setDiag((p) => ({ ...p, catatanDokter: e.target.value }))}
                      className={textareaCls}
                    />
                  </Field>
                </div>
              </section>
            </form>
            <div className="fixed inset-x-0 bottom-0 z-30 flex gap-3 border-t border-line bg-surface p-4 md:static md:mt-5 md:justify-end md:border-0 md:bg-transparent md:p-0">
              {tombol("form-diagnosa", "Simpan Diagnosa", dPending, !d.bisaDiagnosa)}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
