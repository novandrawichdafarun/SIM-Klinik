"use client";

import Link from "next/link";
import { startTransition, useActionState, useState } from "react";
import { CalendarDays, IdCard, LockKeyhole, Save, ShieldCheck, X } from "lucide-react";
import { savePasienAction } from "@/actions/rekap-pasien";
import { useFeedbackAksi } from "@/components/feedback/useFeedbackAksi";
import type { ActionResponse } from "@/types/action";
import {
  AGAMA,
  STATUS_PERNIKAHAN,
  type Pasien,
} from "@/types/rekap-pasien";
import { formatTanggal, hitungUsia } from "@/utils/format";
import { Field, inputCls } from "./FormBits";

const KOSONG = {
  namaLengkap: "",
  NIK: "",
  jenisKelamin: "",
  tempatLahir: "",
  tanggalLahir: "",
  golonganDarah: "",
  statusPernikahan: "",
  agama: "",
  pekerjaan: "",
  noHp: "",
  email: "",
  alamat: "",
  alamatDomisili: "",
  kecamatan: "",
  kotaKabupaten: "",
  provinsi: "",
  jenisPenjamin: "Umum",
  noBpjs: "",
  fktpAsal: "",
};
type Nilai = typeof KOSONG;

const inputModalCls = `${inputCls} border-transparent bg-surface-muted focus:border-emerald-500`;

function noHpLokal(value: string | null) {
  if (!value) return "";
  const angka = value.replace(/\D/g, "");
  if (angka.startsWith("62")) return angka.slice(2);
  return angka.startsWith("0") ? angka.slice(1) : angka;
}

function dariPasien(p: Pasien | null): Nilai {
  if (!p) return KOSONG;
  const nilai = { ...KOSONG };
  for (const k of Object.keys(KOSONG) as (keyof Nilai)[]) {
    if (k === "noHp") nilai[k] = noHpLokal(p.noHp);
    else nilai[k] = (p[k as keyof Pasien] as string | null) ?? "";
  }
  return nilai;
}

function PilihanSegment({
  label,
  pilihan,
  aktif,
  pilih,
}: {
  label: string;
  pilihan: { value: string; label: string }[];
  aktif: string;
  pilih: (value: string) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-1 block text-xs font-semibold text-ink-2">{label}</legend>
      <div className="grid grid-flow-col auto-cols-fr gap-1 rounded-lg bg-surface-muted p-1">
        {pilihan.map((item) => (
          <button
            key={item.value}
            type="button"
            aria-pressed={aktif === item.value}
            onClick={() => pilih(item.value)}
            className={`min-h-9 rounded-md px-2 text-xs font-semibold transition ${
              aktif === item.value
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-ink-2 hover:bg-surface-hover"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export default function PasienForm({ pasien }: { pasien: Pasien | null }) {
  const isEdit = pasien !== null;
  const [v, setV] = useState<Nilai>(() => dariPasien(pasien));
  const [domisiliSama, setDomisiliSama] = useState(
    !pasien?.alamatDomisili || pasien.alamatDomisili === pasien.alamat,
  );
  const set =
    (k: keyof Nilai) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setV((prev) => ({ ...prev, [k]: e.target.value }));

  const [state, formAction, isPending] = useActionState<ActionResponse | null, FormData>(
    savePasienAction.bind(null, pasien?.idPasien ?? null),
    null,
  );
  useFeedbackAksi(state);

  const isBpjs = v.jenisPenjamin === "BPJS Kesehatan (JKN)";
  const usia = hitungUsia(v.tanggalLahir || null);
  const golongan = v.golonganDarah.startsWith("AB")
    ? "AB"
    : v.golonganDarah.slice(0, 1);
  const closeHref = isEdit ? `/rekap-pasien/${pasien.idPasien}` : "/rekap-pasien?tab=semua";

  const teks = (
    k: keyof Nilai,
    label: string,
    opts: {
      required?: boolean;
      max?: number;
      type?: string;
      placeholder?: string;
      className?: string;
      inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
    } = {},
  ) => (
    <Field label={label} htmlFor={k} required={opts.required} className={opts.className}>
      <input
        id={k}
        name={k}
        type={opts.type ?? "text"}
        value={v[k]}
        onChange={set(k)}
        required={opts.required}
        maxLength={opts.max}
        placeholder={opts.placeholder}
        inputMode={opts.inputMode}
        className={inputModalCls}
      />
    </Field>
  );

  const pilih = (
    k: keyof Nilai,
    label: string,
    list: readonly string[],
    required = false,
  ) => (
    <Field label={label} htmlFor={k} required={required}>
      <select
        id={k}
        name={k}
        value={v[k]}
        onChange={set(k)}
        required={required}
        className={inputModalCls}
      >
        <option value="">{required ? "Pilih" : "Tidak diisi"}</option>
        {list.map((x) => (
          <option key={x} value={x}>
            {x}
          </option>
        ))}
      </select>
    </Field>
  );

  return (
    <form
      role="dialog"
      aria-modal="true"
      aria-labelledby="judul-form-pasien"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        if (domisiliSama) fd.set("alamatDomisili", "");
        startTransition(() => formAction(fd));
      }}
      className="fixed inset-0 z-50 flex overflow-hidden bg-black/40 md:items-center md:justify-center md:p-4"
    >
      <div className="flex h-full w-full flex-col overflow-hidden bg-background md:h-[calc(100vh-2rem)] md:max-h-[calc(100vh-2rem)] md:max-w-5xl md:rounded-2xl md:border md:border-line md:bg-surface md:shadow-xl">
        <header className="z-10 flex shrink-0 items-start gap-3 border-b border-line bg-surface px-4 py-4 md:px-6">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent-ink">
            <IdCard aria-hidden="true" size={19} />
          </span>
          <div className="min-w-0 flex-1">
            <h1 id="judul-form-pasien" className="text-lg font-bold">
              {isEdit ? "Edit Data Pasien" : "Tambah Pasien"}
            </h1>
            {isEdit && pasien && (
              <p className="mt-1 text-[11px] leading-5 text-ink-3">
                No. RM: <b className="text-ink">{pasien.NoRM}</b>
                {" · "}NIK: <b className="text-ink">{pasien.NIK}</b>
                {" · "}Terdaftar sejak: <b className="text-ink">{formatTanggal(pasien.createdAt)}</b>
              </p>
            )}
          </div>
          <Link
            href={closeHref}
            aria-label="Tutup form pasien"
            className="grid size-9 shrink-0 place-items-center rounded-full bg-surface-muted text-ink-2 hover:bg-surface-hover"
          >
            <X aria-hidden="true" size={17} />
          </Link>
        </header>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-background p-4 md:p-5">
          <section className="rounded-xl border border-line bg-surface p-4 shadow-sm md:p-5">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-bold">
              <ShieldCheck aria-hidden="true" size={16} className="text-accent-ink" />
              Validasi Identitas Kependudukan (NIK Dukcapil)
            </h2>
            <Field label="Nomor Induk Kependudukan (NIK 16 digit)" htmlFor="NIK" required>
              <div className="relative">
                <input
                  id="NIK"
                  value={v.NIK}
                  onChange={set("NIK")}
                  required
                  inputMode="numeric"
                  pattern="\d{16}"
                  maxLength={16}
                  disabled={isEdit}
                  className={`${inputModalCls} pr-10 ${isEdit ? "cursor-not-allowed" : ""}`}
                />
                {isEdit ? (
                  <>
                    <input type="hidden" name="NIK" value={v.NIK} />
                    <LockKeyhole
                      aria-hidden="true"
                      size={15}
                      className="absolute top-1/2 right-3 -translate-y-1/2 text-accent-ink"
                    />
                  </>
                ) : (
                  <input type="hidden" name="NIK" value={v.NIK} />
                )}
              </div>
            </Field>
          </section>

          <section className="rounded-xl border border-line bg-surface p-4 shadow-sm md:p-5">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-bold">
              <IdCard aria-hidden="true" size={16} className="text-accent-ink" />
              Data Demografi Pasien
            </h2>
            <div className="grid gap-4 md:grid-cols-3">
              {teks("namaLengkap", "Nama Lengkap (Sesuai KTP/KIA)", {
                required: true,
                max: 100,
                className: "md:col-span-2",
              })}
              {teks("tempatLahir", "Tempat Lahir", { max: 100 })}
              <Field label="Tanggal Lahir & Usia" htmlFor="tanggalLahir">
                <div className="flex items-center gap-2">
                  <div className="relative min-w-0 flex-1">
                    <input
                      id="tanggalLahir"
                      name="tanggalLahir"
                      type="date"
                      value={v.tanggalLahir}
                      onChange={set("tanggalLahir")}
                      max={new Date().toISOString().slice(0, 10)}
                      className={`${inputModalCls} pr-9`}
                    />
                    <CalendarDays
                      aria-hidden="true"
                      size={15}
                      className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-ink-3"
                    />
                  </div>
                  {usia !== null && (
                    <span className="shrink-0 rounded-full bg-accent-soft px-2.5 py-1.5 text-xs font-semibold text-accent-ink">
                      {usia} th
                    </span>
                  )}
                </div>
              </Field>
              <PilihanSegment
                label="Jenis Kelamin"
                pilihan={[
                  { value: "L", label: "Laki-laki" },
                  { value: "P", label: "Perempuan" },
                ]}
                aktif={v.jenisKelamin}
                pilih={(value) => setV((prev) => ({ ...prev, jenisKelamin: value }))}
              />
              <input type="hidden" name="jenisKelamin" value={v.jenisKelamin} />
              <div className="md:col-span-2">
                <fieldset>
                  <legend className="mb-1 block text-xs font-semibold text-ink-2">
                    Golongan Darah & Rhesus
                  </legend>
                  <div className="flex flex-col gap-2">
                    <div className="grid grid-cols-4 gap-1 rounded-lg bg-surface-muted p-1">
                      {["A", "B", "AB", "O"].map((item) => (
                        <button
                          key={item}
                          type="button"
                          aria-pressed={golongan === item}
                          onClick={() =>
                            setV((prev) => ({
                              ...prev,
                              golonganDarah: `${item}${prev.golonganDarah.endsWith("-") ? "-" : "+"}`,
                            }))
                          }
                          className={`min-h-8 rounded-md text-xs font-semibold ${
                            golongan === item
                              ? "bg-emerald-600 text-white"
                              : "text-ink-2 hover:bg-surface-hover"
                          }`}
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-1 rounded-lg bg-surface-muted p-1">
                      {["+","-"].map((item) => (
                        <button
                          key={item}
                          type="button"
                          aria-pressed={v.golonganDarah.endsWith(item)}
                          onClick={() =>
                            setV((prev) => ({
                              ...prev,
                              golonganDarah: prev.golonganDarah
                                ? `${prev.golonganDarah.replace(/[+-]$/, "")}${item}`
                                : "",
                            }))
                          }
                          className={`min-h-8 rounded-md text-xs font-semibold ${
                            v.golonganDarah.endsWith(item)
                              ? "bg-emerald-600 text-white"
                              : "text-ink-2 hover:bg-surface-hover"
                          }`}
                        >
                          Rh({item})
                        </button>
                      ))}
                    </div>
                  </div>
                  <input type="hidden" name="golonganDarah" value={v.golonganDarah} />
                </fieldset>
              </div>
              {pilih("statusPernikahan", "Status Pernikahan", STATUS_PERNIKAHAN)}
              {pilih("agama", "Agama", AGAMA)}
              {teks("pekerjaan", "Pekerjaan", { max: 100 })}
            </div>
          </section>

          <section className="rounded-xl border border-line bg-surface p-4 shadow-sm md:p-5">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-bold">
              <IdCard aria-hidden="true" size={16} className="text-accent-ink" />
              Kontak & Alamat Domisili
            </h2>
            <div className="grid gap-4 md:grid-cols-3">
              <Field label="Nomor WhatsApp Pasien" htmlFor="noHp">
                <div className="flex h-10 overflow-hidden rounded-lg border border-transparent bg-surface-muted focus-within:border-emerald-500">
                  <span className="grid shrink-0 place-items-center border-r border-line px-3 text-sm font-semibold text-ink-2">
                    +62
                  </span>
                  <input
                    id="noHp"
                    name="noHp"
                    type="tel"
                    inputMode="tel"
                    value={v.noHp}
                    onChange={(e) => {
                      const angka = e.target.value.replace(/\D/g, "");
                      const lokal = angka.startsWith("62")
                        ? angka.slice(2)
                        : angka.startsWith("0")
                          ? angka.slice(1)
                          : angka;
                      setV((prev) => ({ ...prev, noHp: lokal }));
                    }}
                    maxLength={18}
                    placeholder="812-3456-7890"
                    className="min-w-0 flex-1 bg-transparent px-3 text-sm outline-none"
                  />
                </div>
              </Field>
              {teks("email", "Email Pasien (Untuk Pengiriman Invoice/Resume)", {
                type: "email",
                max: 254,
              })}
              {teks("alamat", "Alamat Lengkap (Sesuai KTP)", {
                max: 255,
                className: "md:col-span-2",
              })}
              {teks("provinsi", "Provinsi", { max: 100 })}
              {teks("kotaKabupaten", "Kota / Kabupaten", { max: 100 })}
              {teks("kecamatan", "Kecamatan", { max: 100 })}
              <label               className="flex items-center gap-2 text-sm md:col-span-3">
                <input
                  type="checkbox"
                  checked={domisiliSama}
                  onChange={(e) => setDomisiliSama(e.target.checked)}
                  className="size-4 accent-chart"
                />
                Alamat domisili saat ini sama dengan alamat KTP
              </label>
              {!domisiliSama &&
                teks("alamatDomisili", "Alamat Domisili", {
                  max: 255,
                  className: "md:col-span-3",
                })}
            </div>
          </section>

          <section className="rounded-xl border border-line bg-surface p-4 shadow-sm md:p-5">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-bold">
              <ShieldCheck aria-hidden="true" size={16} className="text-accent-ink" />
              Penjamin & Asuransi Kesehatan
            </h2>
            <div className="space-y-4">
              <PilihanSegment
                label="Jenis Penjamin"
                pilihan={[
                  { value: "BPJS Kesehatan (JKN)", label: "BPJS Kesehatan (JKN)" },
                  { value: "Asuransi Swasta", label: "Asuransi Swasta" },
                  { value: "Umum", label: "Umum / Tunai" },
                ]}
                aktif={v.jenisPenjamin}
                pilih={(value) => setV((prev) => ({ ...prev, jenisPenjamin: value }))}
              />
              <input type="hidden" name="jenisPenjamin" value={v.jenisPenjamin} />
              {isBpjs && (
                <div className="grid gap-4 md:grid-cols-2">
                  {teks("noBpjs", "Nomor Kartu BPJS (13 Digit)", {
                    required: true,
                    max: 13,
                    inputMode: "numeric",
                  })}
                  {teks("fktpAsal", "Fasilitas Kesehatan Tingkat Pertama (FKTP Asal)", {
                    required: true,
                    max: 150,
                    placeholder: "Kode · nama faskes",
                  })}
                </div>
              )}
            </div>
          </section>
        </div>

        <footer className="z-10 flex shrink-0 gap-2 border-t border-line bg-surface p-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] md:justify-end md:px-6 md:py-4">
          <Link
            href={closeHref}
            className="flex h-11 flex-1 items-center justify-center rounded-lg border border-line bg-surface px-4 text-sm font-semibold hover:bg-surface-hover md:flex-none"
          >
            Batal
          </Link>
          <button
            type="submit"
            disabled={isPending}
            className="flex h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-500 px-5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-600 disabled:opacity-60 md:flex-none"
          >
            <Save aria-hidden="true" size={16} />
            {isPending ? "Menyimpan..." : isEdit ? "Simpan Perubahan" : "Simpan Pasien"}
          </button>
        </footer>
      </div>
    </form>
  );
}
