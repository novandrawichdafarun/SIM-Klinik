import { cache } from "react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { RowDataPacket } from "mysql2";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getMySQLPool } from "@/database/mysql-client";
import type { UserRole } from "@/types/auth";
import type { AksiHakAkses, KodeFitur } from "@/types/hak-akses";

/**
 * Pusat otorisasi. Semua pengecekan akses membaca DATABASE, bukan isi JWT,
 * supaya pencabutan akses / penonaktifan akun langsung berlaku.
 */

export interface CurrentUser {
  idUser: string;
  email: string;
  role: UserRole;
  namaLengkap: string | null;
  isSuperAdmin: boolean;
}

export const KOLOM_AKSI: Record<AksiHakAkses, string> = {
  lihat: "bisaLihat",
  tambah: "bisaTambah",
  ubah: "bisaUbah",
  hapus: "bisaHapus",
};

/** User yang sedang login, atau null jika belum login / akun nonaktif. Di-cache per request. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await getServerSession(authOptions);
  const idUser = session?.user?.id;
  if (!idUser || session.error) return null;

  const pool = getMySQLPool();
  const [rows] = await pool.execute<RowDataPacket[]>({
    sql: `SELECT u.id_user, u.email, u.role, u.is_active, k.statusAktif, k.namaLengkap
            FROM users u
            LEFT JOIN karyawan k ON k.id_user = u.id_user
           WHERE u.id_user = ? LIMIT 1`,
    values: [idUser],
  });

  const row = rows[0];
  // statusAktif NULL (akun tanpa data karyawan) tetap boleh masuk
  if (!row || row.is_active === false || row.statusAktif === false) return null;

  return {
    idUser: row.id_user,
    email: row.email,
    role: row.role as UserRole,
    namaLengkap: row.namaLengkap ?? null,
    isSuperAdmin: row.role === "super_admin",
  };
});

/** Untuk server action: lempar Error jika belum login. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Sesi tidak valid atau akun nonaktif. Silakan login ulang.");
  }
  return user;
}

/** Untuk server action: hanya Pimpinan Klinik / Super Admin. */
export async function requireSuperAdmin(): Promise<CurrentUser> {
  const user = await requireUser();
  if (!user.isSuperAdmin) {
    throw new Error("Fitur ini hanya dapat diakses oleh Pimpinan Klinik (Super Admin).");
  }
  return user;
}

/** Untuk halaman (server component): arahkan ke login / 403, bukan melempar error. */
export async function requireSuperAdminPage(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  if (!user.isSuperAdmin) redirect("/errors/403");
  return user;
}

/** Untuk halaman (server component): arahkan ke login / 403 bila izin fitur tidak tersedia. */
export async function requirePermissionPage(
  kodeFitur: KodeFitur,
  aksi: AksiHakAkses,
): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  if (!(await hasPermission(user, kodeFitur, aksi))) redirect("/errors/403");
  return user;
}

/** Cek izin per fitur dari tabel hak_akses. Super Admin selalu boleh. */
export async function hasPermission(
  user: CurrentUser,
  kodeFitur: KodeFitur,
  aksi: AksiHakAkses,
): Promise<boolean> {
  if (user.isSuperAdmin) return true;

  const pool = getMySQLPool();
  const [rows] = await pool.execute<RowDataPacket[]>({
    sql: `SELECT h.${KOLOM_AKSI[aksi]} AS boleh
            FROM hak_akses h
            JOIN fitur f ON f.kodeFitur = h.kodeFitur
           WHERE h.id_user = ? AND h.kodeFitur = ? AND f.khususSuperAdmin = FALSE
           LIMIT 1`,
    values: [user.idUser, kodeFitur],
  });
  return rows[0]?.boleh === true;
}

/** Untuk server action fitur lain nanti, mis. requirePermission("arus_kas", "tambah"). */
export async function requirePermission(
  kodeFitur: KodeFitur,
  aksi: AksiHakAkses,
): Promise<CurrentUser> {
  const user = await requireUser();
  if (!(await hasPermission(user, kodeFitur, aksi))) {
    throw new Error("Anda tidak memiliki akses ke fitur ini.");
  }
  return user;
}
