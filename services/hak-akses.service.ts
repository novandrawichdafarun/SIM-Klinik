import { RowDataPacket } from "mysql2";
import { getMySQLPool } from "@/database/mysql-client";
import { ActionResponse } from "@/types/action";
import type { UserRole } from "@/types/auth";
import type {
  DetailHakAkses,
  Fitur,
  IzinFitur,
  MatriksHakAkses,
  PenggunaHakAkses,
} from "@/types/hak-akses";
import { handleServiceError } from "@/utils/error";
import { mysqlTransaction } from "@/utils/mysql";

const IZIN_KOSONG: IzinFitur = { lihat: false, tambah: false, ubah: false, hapus: false };
const IZIN_PENUH: IzinFitur = { lihat: true, tambah: true, ubah: true, hapus: true };

/** Tambah/ubah/hapus tanpa lihat tidak masuk akal → lihat ikut aktif */
export function normalisasiIzin(izin: Partial<IzinFitur> | undefined): IzinFitur {
  const tambah = izin?.tambah === true;
  const ubah = izin?.ubah === true;
  const hapus = izin?.hapus === true;
  return { lihat: izin?.lihat === true || tambah || ubah || hapus, tambah, ubah, hapus };
}

function samaIzin(a: IzinFitur, b: IzinFitur): boolean {
  return a.lihat === b.lihat && a.tambah === b.tambah && a.ubah === b.ubah && a.hapus === b.hapus;
}

class HakAksesError extends Error {}

const SELECT_PENGGUNA = `
  SELECT u.id_user, u.email, u.role, u.is_active,
         k.namaLengkap, k.NIP, k.jenisKaryawan, p.namaPoli,
         CASE WHEN u.role = 'super_admin' THEN (SELECT COUNT(*) FROM fitur)
              ELSE (SELECT COUNT(*)
                      FROM hak_akses h
                      JOIN fitur f ON f.kodeFitur = h.kodeFitur
                     WHERE h.id_user = u.id_user AND f.khususSuperAdmin = FALSE
                       AND (h.bisaLihat OR h.bisaTambah OR h.bisaUbah OR h.bisaHapus))
         END AS jumlahFiturAktif
    FROM users u
    LEFT JOIN karyawan k ON k.id_user = u.id_user
    LEFT JOIN poli p ON p.idPoli = k.idPoli`;

function toPengguna(row: RowDataPacket): PenggunaHakAkses {
  return {
    idUser: row.id_user,
    email: row.email,
    role: row.role as UserRole,
    isActive: row.is_active,
    namaLengkap: row.namaLengkap ?? null,
    NIP: row.NIP ?? null,
    jenisKaryawan: row.jenisKaryawan ?? null,
    namaPoli: row.namaPoli ?? null,
    jumlahFiturAktif: Number(row.jumlahFiturAktif),
  };
}

export const getFiturListService = async (): Promise<ActionResponse<Fitur[]>> => {
  try {
    const pool = getMySQLPool();
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT kodeFitur, namaFitur, deskripsi, grup, khususSuperAdmin
         FROM fitur ORDER BY urutan ASC, namaFitur ASC`,
    );
    return {
      success: true,
      data: rows.map((r) => ({
        kodeFitur: r.kodeFitur,
        namaFitur: r.namaFitur,
        deskripsi: r.deskripsi ?? null,
        grup: r.grup,
        khususSuperAdmin: r.khususSuperAdmin,
      })),
    };
  } catch (err) {
    return handleServiceError(err, "Terjadi kesalahan saat mengambil daftar fitur.");
  }
};

/** Semua akun (karyawan yang sudah punya akun) untuk panel kiri halaman Hak Akses */
export const getPenggunaHakAksesListService = async (): Promise<
  ActionResponse<PenggunaHakAkses[]>
> => {
  try {
    const pool = getMySQLPool();
    const [rows] = await pool.query<RowDataPacket[]>(
      `${SELECT_PENGGUNA}
        ORDER BY (u.role = 'super_admin') ASC, k.namaLengkap ASC, u.email ASC`,
    );
    return { success: true, data: rows.map(toPengguna) };
  } catch (err) {
    return handleServiceError(err, "Terjadi kesalahan saat mengambil daftar karyawan.");
  }
};

export const getDetailHakAksesService = async (
  idUser: string,
  fitur: Fitur[],
): Promise<ActionResponse<DetailHakAkses>> => {
  try {
    const pool = getMySQLPool();
    const [[penggunaRows], [aksesRows], [terakhirRows]] = await Promise.all([
      pool.execute<RowDataPacket[]>({
        sql: `${SELECT_PENGGUNA} WHERE u.id_user = ? LIMIT 1`,
        values: [idUser],
      }),
      pool.execute<RowDataPacket[]>({
        sql: `SELECT kodeFitur, bisaLihat, bisaTambah, bisaUbah, bisaHapus
                FROM hak_akses WHERE id_user = ?`,
        values: [idUser],
      }),
      pool.execute<RowDataPacket[]>({
        sql: `SELECT h.updated_at, COALESCE(k.namaLengkap, u.email) AS oleh
                FROM hak_akses h
                LEFT JOIN users u ON u.id_user = h.diubahOleh
                LEFT JOIN karyawan k ON k.id_user = h.diubahOleh
               WHERE h.id_user = ?
               ORDER BY h.updated_at DESC
               LIMIT 1`,
        values: [idUser],
      }),
    ]);

    if (!penggunaRows[0]) return { success: false, error: "Akun tidak ditemukan." };
    const pengguna = toPengguna(penggunaRows[0]);

    const tersimpan = new Map(
      aksesRows.map((r) => [
        r.kodeFitur as string,
        { lihat: r.bisaLihat, tambah: r.bisaTambah, ubah: r.bisaUbah, hapus: r.bisaHapus },
      ]),
    );

    const matriks: MatriksHakAkses = {};
    for (const f of fitur) {
      if (pengguna.role === "super_admin") matriks[f.kodeFitur] = { ...IZIN_PENUH };
      else if (f.khususSuperAdmin) matriks[f.kodeFitur] = { ...IZIN_KOSONG };
      else matriks[f.kodeFitur] = tersimpan.get(f.kodeFitur) ?? { ...IZIN_KOSONG };
    }

    return {
      success: true,
      data: {
        pengguna,
        matriks,
        terakhirDiubah: terakhirRows[0]
          ? { waktu: terakhirRows[0].updated_at, oleh: terakhirRows[0].oleh ?? null }
          : null,
      },
    };
  } catch (err) {
    return handleServiceError(err, "Terjadi kesalahan saat mengambil hak akses.");
  }
};

/** Simpan matriks hak akses. Hanya baris yang berubah yang ditulis (supaya jejak "diubah oleh" akurat). */
export const saveHakAksesService = async (
  idUser: string,
  matriks: MatriksHakAkses,
  actorIdUser: string,
): Promise<ActionResponse<{ jumlahBerubah: number }>> => {
  try {
    const jumlahBerubah = await mysqlTransaction(async (conn) => {
      const [userRows] = await conn.execute<RowDataPacket[]>({
        sql: "SELECT role FROM users WHERE id_user = ? FOR UPDATE",
        values: [idUser],
      });
      if (!userRows[0]) throw new HakAksesError("Akun tidak ditemukan.");
      if (userRows[0].role === "super_admin") {
        throw new HakAksesError("Super Admin selalu memiliki seluruh akses dan tidak perlu diatur.");
      }

      const [fiturRows] = await conn.query<RowDataPacket[]>(
        "SELECT kodeFitur FROM fitur WHERE khususSuperAdmin = FALSE",
      );
      const [lamaRows] = await conn.execute<RowDataPacket[]>({
        sql: `SELECT kodeFitur, bisaLihat, bisaTambah, bisaUbah, bisaHapus
                FROM hak_akses WHERE id_user = ? FOR UPDATE`,
        values: [idUser],
      });
      const lama = new Map(
        lamaRows.map((r) => [
          r.kodeFitur as string,
          { lihat: r.bisaLihat, tambah: r.bisaTambah, ubah: r.bisaUbah, hapus: r.bisaHapus },
        ]),
      );

      let berubah = 0;
      // Hanya fitur yang boleh diatur; kode asing / khusus super admin diabaikan
      for (const { kodeFitur } of fiturRows) {
        const baru = normalisasiIzin(matriks[kodeFitur]);
        if (samaIzin(baru, lama.get(kodeFitur) ?? IZIN_KOSONG)) continue;

        await conn.execute({
          sql: `INSERT INTO hak_akses
                  (id_user, kodeFitur, bisaLihat, bisaTambah, bisaUbah, bisaHapus, diubahOleh)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                  bisaLihat = VALUES(bisaLihat), bisaTambah = VALUES(bisaTambah),
                  bisaUbah = VALUES(bisaUbah), bisaHapus = VALUES(bisaHapus),
                  diubahOleh = VALUES(diubahOleh), updated_at = CURRENT_TIMESTAMP`,
          values: [idUser, kodeFitur, baru.lihat, baru.tambah, baru.ubah, baru.hapus, actorIdUser],
        });
        berubah++;
      }
      return berubah;
    });

    return {
      success: true,
      data: { jumlahBerubah },
      message:
        jumlahBerubah > 0
          ? "Hak akses berhasil disimpan."
          : "Tidak ada perubahan hak akses.",
    };
  } catch (err) {
    if (err instanceof HakAksesError) return { success: false, error: err.message };
    return handleServiceError(err, "Terjadi kesalahan saat menyimpan hak akses.");
  }
};
