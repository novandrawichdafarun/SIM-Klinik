import type { UserRole } from "@/types/auth";
import type { AksiHakAkses, Fitur, KodeFitur, MatriksHakAkses } from "@/types/hak-akses";

/**
 * Hak akses default per role, diturunkan dari use case diagram SISTEM ERM KLINIK.
 * Dipakai untuk mencentang otomatis matriks hak akses saat Super Admin menambah akun;
 * Super Admin tetap boleh mengubahnya sebelum menyimpan.
 *
 * - Dokter  : "Mengisi diagnosa pasien" + "Melihat rekap data pasien"
 * - Admin   : (aktor Perawat/staf) "CRUD data pasien" + "Melihat rekap data pasien"
 *             + membuat & mengirim Invoice Digital (tautan rating via WhatsApp)
 * - Super Admin: seluruh fitur (tidak memakai matriks).
 *
 * Use case milik semua karyawan yang bersifat pribadi (melihat & mengklaim jasa pelayanan,
 * melihat rating pribadi, logout) tidak perlu dicentang: datanya selalu milik akun itu sendiri.
 */
export const DEFAULT_HAK_AKSES: Record<
  Exclude<UserRole, "super_admin">,
  Partial<Record<KodeFitur, AksiHakAkses[]>>
> = {
  dokter: {
    rekap_pasien: ["lihat", "ubah"],
  },
  admin: {
    rekap_pasien: ["lihat"],
    input_pasien: ["lihat", "tambah", "ubah", "hapus"],
    invoice_digital: ["lihat", "tambah"],
  },
};

/** Matriks lengkap (semua fitur) berisi default untuk role tertentu */
export function defaultMatriksUntukRole(role: UserRole, fitur: Fitur[]): MatriksHakAkses {
  const matriks: MatriksHakAkses = {};
  const preset = role === "super_admin" ? {} : DEFAULT_HAK_AKSES[role];
  for (const f of fitur) {
    const aksi: AksiHakAkses[] =
      role === "super_admin"
        ? ["lihat", "tambah", "ubah", "hapus"]
        : f.khususSuperAdmin
          ? []
          : (preset[f.kodeFitur as KodeFitur] ?? []);
    matriks[f.kodeFitur] = {
      lihat: aksi.includes("lihat"),
      tambah: aksi.includes("tambah"),
      ubah: aksi.includes("ubah"),
      hapus: aksi.includes("hapus"),
    };
  }
  return matriks;
}
