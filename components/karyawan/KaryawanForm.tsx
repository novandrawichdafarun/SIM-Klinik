"use client";

import Link from "next/link";
import { startTransition, useActionState, useState } from "react";
import { Save } from "lucide-react";
import { saveKaryawanAction } from "@/actions/karyawan";
import ErrorBox from "@/components/ui/ErrorBox";
import type { ActionResponse } from "@/types/action";
import type { KaryawanFormValues, Poli } from "@/types/karyawan";

const JABATAN_SARAN = [
  "Dokter Umum",
  "Dokter Gigi",
  "Perawat",
  "Bidan",
  "Apoteker",
  "Terapis Gigi dan Mulut",
  "Administrasi",
  "Kasir",
  "Pimpinan Klinik",
];

type FormState = {
  namaLengkap: string;
  NIK: string;
  jenisKaryawan: string;
  idPoli: string;
  noHp: string;
  STR: string;
  SIP: string;
  statusAktif: "1" | "0";
};

function toFormState(v: KaryawanFormValues | null): FormState {
  return {
    namaLengkap: v?.namaLengkap ?? "",
    NIK: v?.NIK ?? "",
    jenisKaryawan: v?.jenisKaryawan ?? "",
    idPoli: v?.idPoli ? String(v.idPoli) : "",
    noHp: v?.noHp ?? "",
    STR: v?.STR ?? "",
    SIP: v?.SIP ?? "",
    statusAktif: v && !v.statusAktif ? "0" : "1",
  };
}

const inputClass =
  "h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20";

const readOnlyClass =
  "h-10 w-full cursor-not-allowed rounded-lg border border-line bg-surface-muted px-3 text-sm font-semibold text-ink-2 outline-none";

function Field({
  label,
  htmlFor,
  hint,
  required,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1 block text-xs font-semibold text-ink-2">
        {label}
        {required && <span className="text-danger-ink"> *</span>}
      </label>
      {children}
      {hint && <p className="mt-1 text-[11px] text-ink-3">{hint}</p>}
    </div>
  );
}

export default function KaryawanForm({
  poli,
  initialValues,
}: {
  poli: Poli[];
  initialValues: KaryawanFormValues | null;
}) {
  const idKaryawan = initialValues?.idKaryawan ?? null;
  const isEdit = idKaryawan !== null;

  // Input dikontrol supaya isian tidak hilang ketika server mengembalikan error validasi
  const [values, setValues] = useState<FormState>(() => toFormState(initialValues));
  const set =
    (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setValues((prev) => ({ ...prev, [key]: e.target.value }));

  const [state, formAction, isPending] = useActionState<ActionResponse | null, FormData>(
    saveKaryawanAction.bind(null, idKaryawan),
    null,
  );

  return (
    <form
      // Submit manual (bukan action={...}) supaya React tidak me-reset form,
      // terutama <select>, ketika server mengembalikan error validasi
      onSubmit={(e) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        startTransition(() => formAction(formData));
      }}
      className="space-y-5"
    >
      {state && !state.success && <ErrorBox message={state.error} />}

      <section className="rounded-xl border border-line bg-surface p-5 shadow-sm">
        <h2 className="mb-4 text-[15px] font-bold">Identitas</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Nama lengkap (dengan gelar)" htmlFor="namaLengkap" required>
            <input
              id="namaLengkap"
              name="namaLengkap"
              value={values.namaLengkap}
              onChange={set("namaLengkap")}
              maxLength={100}
              required
              placeholder="Contoh: dr. Rina Kartika"
              className={inputClass}
            />
          </Field>
          {/* NIP dibuat otomatis oleh server & tidak dikirim lewat form (tanpa name) */}
          <Field
            label="NIP"
            htmlFor="NIP"
            hint={
              isEdit
                ? "Dibuat otomatis oleh sistem dan tidak dapat diubah."
                : "Dibuat otomatis oleh sistem setelah data disimpan."
            }
          >
            <input
              id="NIP"
              value={initialValues?.NIP ?? "Otomatis (KRY-xxxx)"}
              readOnly
              aria-readonly="true"
              tabIndex={-1}
              className={readOnlyClass}
            />
          </Field>
          <Field label="No. identitas (NIK)" htmlFor="NIK" required hint="16 digit angka">
            <input
              id="NIK"
              name="NIK"
              value={values.NIK}
              onChange={set("NIK")}
              inputMode="numeric"
              pattern="\d{16}"
              maxLength={16}
              required
              className={inputClass}
            />
          </Field>
          <Field label="No. HP / WhatsApp" htmlFor="noHp">
            <input
              id="noHp"
              name="noHp"
              type="tel"
              value={values.noHp}
              onChange={set("noHp")}
              maxLength={20}
              placeholder="0812-3301-2201"
              className={inputClass}
            />
          </Field>
        </div>
      </section>

      <section className="rounded-xl border border-line bg-surface p-5 shadow-sm">
        <h2 className="mb-4 text-[15px] font-bold">Jabatan &amp; Legalitas</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Field
            label="Jabatan"
            htmlFor="jenisKaryawan"
            required
            hint="Jabatan Pimpinan Klinik otomatis memakai akun Super Admin."
          >
            <input
              id="jenisKaryawan"
              name="jenisKaryawan"
              list="jabatan-saran"
              value={values.jenisKaryawan}
              onChange={set("jenisKaryawan")}
              maxLength={100}
              required
              className={inputClass}
            />
            <datalist id="jabatan-saran">
              {JABATAN_SARAN.map((j) => (
                <option key={j} value={j} />
              ))}
            </datalist>
          </Field>
          <Field label="Unit kerja (poli)" htmlFor="idPoli" required>
            <select
              id="idPoli"
              name="idPoli"
              value={values.idPoli}
              onChange={set("idPoli")}
              required
              className={inputClass}
            >
              <option value="" disabled>
                — Pilih poli —
              </option>
              {poli.map((p) => (
                <option key={p.idPoli} value={p.idPoli}>
                  {p.namaPoli}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Nomor STR" htmlFor="STR" hint="Kosongkan untuk staf non-medis">
            <input
              id="STR"
              name="STR"
              value={values.STR}
              onChange={set("STR")}
              maxLength={255}
              className={inputClass}
            />
          </Field>
          <Field label="Nomor SIP" htmlFor="SIP" hint="Kosongkan untuk staf non-medis">
            <input
              id="SIP"
              name="SIP"
              value={values.SIP}
              onChange={set("SIP")}
              maxLength={255}
              className={inputClass}
            />
          </Field>
          <Field
            label="Status karyawan"
            htmlFor="statusAktif"
            hint="Karyawan nonaktif tidak dapat login dan langsung dikeluarkan dari semua perangkat."
          >
            <select
              id="statusAktif"
              name="statusAktif"
              value={values.statusAktif}
              onChange={set("statusAktif")}
              className={inputClass}
            >
              <option value="1">Aktif</option>
              <option value="0">Nonaktif</option>
            </select>
          </Field>
        </div>
      </section>

      <div className="flex justify-end gap-3">
        <Link
          href={isEdit ? `/karyawan/${idKaryawan}` : "/karyawan"}
          className="flex h-10 items-center rounded-lg border border-line bg-surface px-4 text-sm font-semibold hover:bg-surface-hover"
        >
          Batal
        </Link>
        <button
          type="submit"
          disabled={isPending}
          className="flex h-10 items-center gap-2 rounded-lg bg-emerald-500 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600 disabled:opacity-60"
        >
          <Save aria-hidden="true" size={16} />
          {isPending ? "Menyimpan..." : isEdit ? "Simpan Perubahan" : "Simpan Karyawan"}
        </button>
      </div>
    </form>
  );
}
