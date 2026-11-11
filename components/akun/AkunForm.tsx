"use client";

import Link from "next/link";
import { startTransition, useActionState, useState } from "react";
import { Save } from "lucide-react";
import { createAkunAction, updateAkunAction } from "@/actions/akun";
import { useFeedbackAksi } from "@/components/feedback/useFeedbackAksi";
import type { ActionResponse } from "@/types/action";
import type { Akun } from "@/types/akun";
import type { UserRole } from "@/types/auth";
import type { Fitur, MatriksHakAkses } from "@/types/hak-akses";
import type { KaryawanOption } from "@/types/karyawan";
import { defaultMatriksUntukRole } from "@/libs/hak-akses-default";
import { isJabatanDokter, isJabatanPimpinan, ROLE_OPTIONS } from "@/utils/format";
import HakAksesAwal from "./HakAksesAwal";

const inputClass =
  "h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 disabled:bg-surface-muted disabled:text-ink-3";

function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1 block text-xs font-semibold text-ink-2">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1 text-[11px] text-ink-3">{hint}</p>}
    </div>
  );
}

/**
 * Role awal dari jabatan: Pimpinan Klinik → Super Admin (wajib),
 * dokter → Dokter, selain itu (perawat, staf, dll.) → Admin.
 */
function tebakRole(jenisKaryawan: string | null | undefined): UserRole {
  if (isJabatanPimpinan(jenisKaryawan)) return "super_admin";
  return isJabatanDokter(jenisKaryawan) ? "dokter" : "admin";
}

type Props =
  | {
      mode: "create";
      karyawanOptions: KaryawanOption[];
      defaultKaryawanId?: number;
      /** Daftar fitur untuk matriks hak akses awal */
      fitur: Fitur[];
    }
  | { mode: "edit"; akun: Akun; isSelf: boolean };

export default function AkunForm(props: Props) {
  const isEdit = props.mode === "edit";

  const initialKaryawan =
    props.mode === "create"
      ? (props.karyawanOptions.find((k) => k.idKaryawan === props.defaultKaryawanId) ?? undefined)
      : undefined;

  // Input dikontrol supaya isian tetap ada saat server mengembalikan error
  const [idKaryawan, setIdKaryawan] = useState(
    initialKaryawan ? String(initialKaryawan.idKaryawan) : "",
  );
  const [email, setEmail] = useState(isEdit ? props.akun.email : "");
  const [role, setRole] = useState<UserRole>(
    isEdit ? props.akun.role : tebakRole(initialKaryawan?.jenisKaryawan),
  );
  const [isActive, setIsActive] = useState(isEdit ? (props.akun.isActive ? "1" : "0") : "1");
  // Hak akses awal (hanya mode tambah): dicentang otomatis sesuai role
  const [matriks, setMatriks] = useState<MatriksHakAkses>(() =>
    props.mode === "create"
      ? defaultMatriksUntukRole(tebakRole(initialKaryawan?.jenisKaryawan), props.fitur)
      : {},
  );

  /** Ganti role sekaligus centang ulang hak akses default untuk role tersebut */
  function gantiRole(next: UserRole) {
    setRole(next);
    if (props.mode === "create") setMatriks(defaultMatriksUntukRole(next, props.fitur));
  }
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const action = isEdit ? updateAkunAction.bind(null, props.akun.idUser) : createAkunAction;
  const [state, formAction, isPending] = useActionState<ActionResponse | null, FormData>(
    action,
    null,
  );
  useFeedbackAksi(state);

  const lockSelf = isEdit && props.isSelf;

  // Jabatan karyawan yang sedang dipilih / diubah
  const jabatan = isEdit
    ? props.akun.jenisKaryawan
    : props.karyawanOptions.find((k) => String(k.idKaryawan) === idKaryawan)?.jenisKaryawan;
  const isPimpinan = isJabatanPimpinan(jabatan);
  const lockRole = lockSelf || isPimpinan;
  const roleValue: UserRole = isPimpinan ? "super_admin" : role;

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

      <section className="space-y-4 rounded-xl border border-line bg-surface p-5 shadow-sm">
        {props.mode === "create" ? (
          <Field
            label="Karyawan"
            htmlFor="idKaryawan"
            hint="Hanya karyawan aktif yang belum memiliki akun."
          >
            <select
              id="idKaryawan"
              name="idKaryawan"
              required
              value={idKaryawan}
              onChange={(e) => {
                setIdKaryawan(e.target.value);
                gantiRole(
                  tebakRole(
                    props.karyawanOptions.find((k) => String(k.idKaryawan) === e.target.value)
                      ?.jenisKaryawan,
                  ),
                );
              }}
              className={inputClass}
            >
              <option value="">— Pilih karyawan —</option>
              {props.karyawanOptions.map((k) => (
                <option key={k.idKaryawan} value={k.idKaryawan}>
                  {k.namaLengkap} — {[k.jenisKaryawan, k.namaPoli].filter(Boolean).join(" · ")}
                </option>
              ))}
            </select>
          </Field>
        ) : (
          <div className="rounded-lg bg-surface-muted px-4 py-3 text-sm">
            <p className="font-semibold">{props.akun.namaLengkap ?? "(tanpa data karyawan)"}</p>
            <p className="text-xs text-ink-3">
              {[props.akun.jenisKaryawan, props.akun.namaPoli].filter(Boolean).join(" · ") || "-"}
            </p>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Email" htmlFor="email">
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="off"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@klinikunusa.id"
              className={inputClass}
            />
          </Field>

          <Field
            label="Role"
            htmlFor="role"
            hint={
              isPimpinan
                ? "Pimpinan Klinik selalu memakai role Super Admin."
                : lockSelf
                  ? "Role akun Anda sendiri tidak dapat diubah."
                  : "Super Admin dapat mengelola karyawan, akun, dan hak akses."
            }
          >
            <select
              id="role"
              name={lockRole ? undefined : "role"}
              value={roleValue}
              disabled={lockRole}
              onChange={(e) => gantiRole(e.target.value as UserRole)}
              className={inputClass}
            >
              {ROLE_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            {lockRole && <input type="hidden" name="role" value={roleValue} />}
          </Field>

          {isEdit && (
            <Field
              label="Status akun"
              htmlFor="isActive"
              hint={
                lockSelf
                  ? "Akun Anda sendiri tidak dapat dinonaktifkan."
                  : "Akun nonaktif tidak bisa login dan langsung dikeluarkan dari semua perangkat."
              }
            >
              <select
                id="isActive"
                name={lockSelf ? undefined : "isActive"}
                value={isActive}
                disabled={lockSelf}
                onChange={(e) => setIsActive(e.target.value)}
                className={inputClass}
              >
                <option value="1">Aktif</option>
                <option value="0">Nonaktif</option>
              </select>
              {lockSelf && <input type="hidden" name="isActive" value={isActive} />}
            </Field>
          )}
        </div>
      </section>

      {props.mode === "create" && (
        <>
          <HakAksesAwal
            role={roleValue}
            fitur={props.fitur}
            matriks={matriks}
            onChange={setMatriks}
            onReset={() => setMatriks(defaultMatriksUntukRole(roleValue, props.fitur))}
          />
          {roleValue !== "super_admin" && (
            <input type="hidden" name="hakAkses" value={JSON.stringify(matriks)} />
          )}
        </>
      )}

      <section className="rounded-xl border border-line bg-surface p-5 shadow-sm">
        <h2 className="mb-1 text-[15px] font-bold">{isEdit ? "Ganti Kata Sandi" : "Kata Sandi"}</h2>
        {isEdit && (
          <p className="mb-4 text-xs text-ink-3">Kosongkan jika kata sandi tidak diubah.</p>
        )}
        <div className={`grid gap-4 md:grid-cols-2 ${isEdit ? "" : "mt-4"}`}>
          <Field label="Kata sandi" htmlFor="password" hint="Minimal 8 karakter">
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required={!isEdit}
              minLength={8}
              maxLength={50}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Konfirmasi kata sandi" htmlFor="confirmPassword">
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required={!isEdit || password !== ""}
              maxLength={50}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={inputClass}
            />
          </Field>
        </div>
      </section>

      <div className="flex justify-end gap-3">
        <Link
          href="/akun"
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
          {isPending ? "Menyimpan..." : isEdit ? "Simpan Perubahan" : "Buat Akun"}
        </button>
      </div>
    </form>
  );
}
