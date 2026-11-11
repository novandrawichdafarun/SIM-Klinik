"use client";

import Link from "next/link";
import { startTransition, useActionState, useState } from "react";
import { Save } from "lucide-react";
import { savePasienAction } from "@/actions/rekap-pasien";
import { useFeedbackAksi } from "@/components/feedback/useFeedbackAksi";
import type { ActionResponse } from "@/types/action";
import {
  AGAMA,
  GOLONGAN_DARAH,
  JENIS_PENJAMIN,
  STATUS_PERNIKAHAN,
  type Pasien,
} from "@/types/rekap-pasien";
import { Field, FormCard, inputCls } from "./FormBits";

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

function dariPasien(p: Pasien | null): Nilai {
  if (!p) return KOSONG;
  const n = { ...KOSONG };
  for (const k of Object.keys(KOSONG) as (keyof Nilai)[])
    n[k] = (p[k as keyof Pasien] as string | null) ?? "";
  return n;
}

export default function PasienForm({ pasien }: { pasien: Pasien | null }) {
  const isEdit = pasien !== null;
  const [v, setV] = useState<Nilai>(() => dariPasien(pasien));
  const [domisiliSama, setDomisiliSama] = useState(!pasien?.alamatDomisili);
  const set =
    (k: keyof Nilai) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setV((prev) => ({ ...prev, [k]: e.target.value }));

  const [state, formAction, isPending] = useActionState<ActionResponse | null, FormData>(
    savePasienAction.bind(null, pasien?.idPasien ?? null),
    null,
  );
  useFeedbackAksi(state);
  const isBpjs = v.jenisPenjamin === "BPJS Kesehatan (JKN)";

  const teks = (
    k: keyof Nilai,
    label: string,
    opts: {
      required?: boolean;
      max?: number;
      type?: string;
      placeholder?: string;
      className?: string;
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
        className={inputCls}
      />
    </Field>
  );
  const pilih = (
    k: keyof Nilai,
    label: string,
    list: readonly string[],
    required = false,
    labels: Record<string, string> = {},
  ) => (
    <Field label={label} htmlFor={k} required={required}>
      <select
        id={k}
        name={k}
        value={v[k]}
        onChange={set(k)}
        required={required}
        className={inputCls}
      >
        <option value="">{required ? "— Pilih —" : "Tidak diisi"}</option>
        {list.map((x) => (
          <option key={x} value={x}>
            {labels[x] ?? x}
          </option>
        ))}
      </select>
    </Field>
  );

  return (
    <form
      // Submit manual supaya isian tidak di-reset React saat server mengembalikan error
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        if (domisiliSama) fd.set("alamatDomisili", "");
        startTransition(() => formAction(fd));
      }}
      className="space-y-5"
    >
      <FormCard title="Data Demografi">
        <p className="-mt-2 mb-4 text-xs text-ink-3">
          {isEdit ? (
            <>
              No. RM <b className="text-ink">{pasien.NoRM}</b> · dibuat otomatis dan tidak dapat
              diubah.
            </>
          ) : (
            "No. RM dibuat otomatis setelah pasien disimpan."
          )}
        </p>
        <div className="grid gap-4 md:grid-cols-3">
          {teks("namaLengkap", "Nama lengkap", {
            required: true,
            max: 100,
            className: "md:col-span-2",
          })}
          <Field label="NIK" htmlFor="NIK" required hint="16 digit angka">
            <input
              id="NIK"
              name="NIK"
              value={v.NIK}
              onChange={set("NIK")}
              required
              inputMode="numeric"
              pattern="\d{16}"
              maxLength={16}
              className={inputCls}
            />
          </Field>
          {pilih("jenisKelamin", "Jenis kelamin", ["L", "P"], true, {
            L: "Laki-laki",
            P: "Perempuan",
          })}
          {teks("tempatLahir", "Tempat lahir", { max: 100 })}
          {teks("tanggalLahir", "Tanggal lahir", { type: "date" })}
          {pilih("golonganDarah", "Golongan darah", GOLONGAN_DARAH)}
          {pilih("statusPernikahan", "Status pernikahan", STATUS_PERNIKAHAN)}
          {pilih("agama", "Agama", AGAMA)}
          {teks("pekerjaan", "Pekerjaan", { max: 100 })}
        </div>
      </FormCard>

      <FormCard title="Kontak & Alamat">
        <div className="grid gap-4 md:grid-cols-3">
          {teks("noHp", "Nomor WhatsApp", {
            type: "tel",
            max: 20,
            placeholder: "+62 812-3456-7890",
          })}
          {teks("email", "Email", { type: "email", max: 254 })}
          <div className="hidden md:block" />
          {teks("alamat", "Alamat lengkap (KTP)", { max: 255, className: "md:col-span-3" })}
          <div className="md:col-span-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={domisiliSama}
                onChange={(e) => setDomisiliSama(e.target.checked)}
                className="size-4 accent-chart"
              />
              Alamat domisili sama dengan KTP
            </label>
          </div>
          {!domisiliSama &&
            teks("alamatDomisili", "Alamat domisili", { max: 255, className: "md:col-span-3" })}
          {teks("kecamatan", "Kecamatan", { max: 100 })}
          {teks("kotaKabupaten", "Kota / Kabupaten", { max: 100 })}
          {teks("provinsi", "Provinsi", { max: 100 })}
        </div>
      </FormCard>

      <FormCard title="Penjamin & Asuransi">
        <div className="grid gap-4 md:grid-cols-3">
          {pilih("jenisPenjamin", "Jenis penjamin", JENIS_PENJAMIN, true)}
          <Field label="Nomor kartu BPJS" htmlFor="noBpjs" required={isBpjs} hint="13 digit">
            <input
              id="noBpjs"
              name="noBpjs"
              value={isBpjs ? v.noBpjs : ""}
              onChange={set("noBpjs")}
              disabled={!isBpjs}
              required={isBpjs}
              inputMode="numeric"
              maxLength={13}
              className={`${inputCls} disabled:bg-surface-muted`}
            />
          </Field>
          {teks("fktpAsal", "FKTP asal", { max: 150, placeholder: "Kode · nama faskes" })}
        </div>
      </FormCard>

      <div className="flex justify-end gap-3">
        <Link
          href={isEdit ? `/rekap-pasien/pasien/${pasien.idPasien}` : "/rekap-pasien?tab=semua"}
          className="flex h-10 items-center rounded-lg border border-line bg-surface px-4 text-sm font-semibold hover:bg-surface-hover"
        >
          Batal
        </Link>
        <button
          type="submit"
          disabled={isPending}
          className="flex h-10 items-center gap-2 rounded-lg bg-emerald-500 px-5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-600 disabled:opacity-60"
        >
          <Save aria-hidden="true" size={16} />
          {isPending ? "Menyimpan..." : "Simpan"}
        </button>
      </div>
    </form>
  );
}
