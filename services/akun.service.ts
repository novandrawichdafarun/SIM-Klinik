import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { PoolConnection, RowDataPacket } from "mysql2/promise";
import { getMySQLPool } from "@/database/mysql-client";
import { ActionResponse } from "@/types/action";
import type { Akun, AkunListParams } from "@/types/akun";
import type { UserRole } from "@/types/auth";
import type { CreateAkunInput, UpdateAkunInput } from "@/schemas/akun.schema";
import type { MatriksHakAkses } from "@/types/hak-akses";
import { normalisasiIzin } from "./hak-akses.service";
import { handleServiceError } from "@/utils/error";
import { isJabatanPimpinan } from "@/utils/format";
import { isMySQLDuplicateError, mysqlTransaction } from "@/utils/mysql";

const SELECT_AKUN = `
  SELECT u.id_user, u.email, u.role, u.is_active, u.last_login_at,
         k.idKaryawan, k.namaLengkap, k.jenisKaryawan, p.namaPoli
    FROM users u
    LEFT JOIN karyawan k ON k.id_user = u.id_user
    LEFT JOIN poli p ON p.idPoli = k.idPoli`;

function toAkun(row: RowDataPacket): Akun {
  return {
    idUser: row.id_user,
    email: row.email,
    role: row.role as UserRole,
    isActive: row.is_active,
    lastLoginAt: row.last_login_at ?? null,
    idKaryawan: row.idKaryawan ?? null,
    namaLengkap: row.namaLengkap ?? null,
    jenisKaryawan: row.jenisKaryawan ?? null,
    namaPoli: row.namaPoli ?? null,
  };
}

/** Error yang pesannya aman ditampilkan ke user */
class AkunError extends Error {}

/** Jumlah super admin aktif selain `exceptIdUser` (dikunci FOR UPDATE di dalam transaksi) */
async function countOtherActiveSuperAdmins(
  conn: PoolConnection,
  exceptIdUser: string,
): Promise<number> {
  const [rows] = await conn.execute<RowDataPacket[]>({
    sql: `SELECT id_user FROM users
           WHERE role = 'super_admin' AND is_active = TRUE AND id_user <> ?
           FOR UPDATE`,
    values: [exceptIdUser],
  });
  return rows.length;
}

export const getAkunListService = async ({
  q,
  status,
}: AkunListParams): Promise<ActionResponse<Akun[]>> => {
  try {
    const pool = getMySQLPool();
    const conditions: string[] = [];
    const values: unknown[] = [];

    const keyword = q.trim();
    if (keyword) {
      conditions.push("(u.email LIKE ? OR k.namaLengkap LIKE ?)");
      values.push(`%${keyword}%`, `%${keyword}%`);
    }
    if (status === "aktif") conditions.push("u.is_active = TRUE");
    if (status === "nonaktif") conditions.push("u.is_active = FALSE");

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const [rows] = await pool.query<RowDataPacket[]>(
      `${SELECT_AKUN}
        ${where}
        ORDER BY (u.role = 'super_admin') DESC, k.namaLengkap ASC, u.email ASC`,
      values,
    );
    return { success: true, data: rows.map(toAkun) };
  } catch (err) {
    return handleServiceError(err, "Terjadi kesalahan saat mengambil data akun.");
  }
};

export const getAkunByIdService = async (idUser: string): Promise<ActionResponse<Akun>> => {
  try {
    const pool = getMySQLPool();
    const [rows] = await pool.execute<RowDataPacket[]>({
      sql: `${SELECT_AKUN} WHERE u.id_user = ? LIMIT 1`,
      values: [idUser],
    });
    if (!rows[0]) return { success: false, error: "Akun tidak ditemukan." };
    return { success: true, data: toAkun(rows[0]) };
  } catch (err) {
    return handleServiceError(err, "Terjadi kesalahan saat mengambil data akun.");
  }
};

export const createAkunService = async (
  input: CreateAkunInput,
  hakAksesAwal: MatriksHakAkses = {},
  actorIdUser: string | null = null,
): Promise<ActionResponse<{ idUser: string }>> => {
  try {
    const hashedPassword = await bcrypt.hash(input.password, 10);
    const idUser = randomUUID();

    await mysqlTransaction(async (conn) => {
      const [rows] = await conn.execute<RowDataPacket[]>({
        sql: `SELECT id_user, statusAktif, jenisKaryawan FROM karyawan
               WHERE idKaryawan = ? FOR UPDATE`,
        values: [input.idKaryawan],
      });
      const karyawan = rows[0];
      if (!karyawan) throw new AkunError("Karyawan tidak ditemukan.");
      if (karyawan.id_user) throw new AkunError("Karyawan ini sudah memiliki akun.");
      if (karyawan.statusAktif === false) {
        throw new AkunError("Karyawan nonaktif tidak dapat dibuatkan akun.");
      }

      // Pimpinan Klinik selalu Super Admin, apa pun pilihan di form
      const role = isJabatanPimpinan(karyawan.jenisKaryawan) ? "super_admin" : input.role;

      await conn.execute({
        sql: `INSERT INTO users (id_user, email, password, role, is_active)
              VALUES (?, ?, ?, ?, TRUE)`,
        values: [idUser, input.email, hashedPassword, role],
      });
      await conn.execute({
        sql: "UPDATE karyawan SET id_user = ? WHERE idKaryawan = ?",
        values: [idUser, input.idKaryawan],
      });

      // Hak akses awal (default role yang sudah disesuaikan Super Admin).
      // Super Admin tidak perlu baris hak_akses; fitur khusus Super Admin diabaikan.
      if (role !== "super_admin") {
        const [fiturRows] = await conn.query<RowDataPacket[]>(
          "SELECT kodeFitur FROM fitur WHERE khususSuperAdmin = FALSE",
        );
        const rows = fiturRows
          .map(({ kodeFitur }) => ({ kodeFitur, izin: normalisasiIzin(hakAksesAwal[kodeFitur]) }))
          .filter(({ izin }) => izin.lihat)
          .map(({ kodeFitur, izin }) => [
            idUser,
            kodeFitur,
            izin.lihat,
            izin.tambah,
            izin.ubah,
            izin.hapus,
            actorIdUser,
          ]);
        if (rows.length > 0) {
          await conn.query(
            `INSERT INTO hak_akses
               (id_user, kodeFitur, bisaLihat, bisaTambah, bisaUbah, bisaHapus, diubahOleh)
             VALUES ?`,
            [rows],
          );
        }
      }
    });

    return { success: true, data: { idUser }, message: "Akun berhasil dibuat." };
  } catch (err) {
    if (err instanceof AkunError) return { success: false, error: err.message };
    if (isMySQLDuplicateError(err)) {
      return { success: false, error: "Email sudah dipakai akun lain." };
    }
    return handleServiceError(err, "Terjadi kesalahan saat membuat akun.");
  }
};

export const updateAkunService = async (
  idUser: string,
  input: UpdateAkunInput,
  actorIdUser: string,
): Promise<ActionResponse> => {
  try {
    const isSelf = idUser === actorIdUser;
    const hashedPassword = input.password ? await bcrypt.hash(input.password, 10) : null;

    await mysqlTransaction(async (conn) => {
      const [rows] = await conn.execute<RowDataPacket[]>({
        sql: `SELECT u.role, u.is_active, k.jenisKaryawan
                FROM users u
                LEFT JOIN karyawan k ON k.id_user = u.id_user
               WHERE u.id_user = ? FOR UPDATE`,
        values: [idUser],
      });
      const current = rows[0];
      if (!current) throw new AkunError("Akun tidak ditemukan.");

      // Pimpinan Klinik selalu Super Admin, apa pun pilihan di form
      const role = isJabatanPimpinan(current.jenisKaryawan) ? "super_admin" : input.role;

      if (isSelf && (role !== current.role || !input.isActive)) {
        throw new AkunError("Anda tidak dapat mengubah role atau menonaktifkan akun Anda sendiri.");
      }

      const kehilanganSuperAdmin =
        current.role === "super_admin" &&
        current.is_active &&
        (role !== "super_admin" || !input.isActive);
      if (kehilanganSuperAdmin && (await countOtherActiveSuperAdmins(conn, idUser)) === 0) {
        throw new AkunError("Minimal harus ada satu Super Admin aktif.");
      }

      await conn.execute({
        sql: `UPDATE users
                 SET email = ?, role = ?, is_active = ?,
                     password = COALESCE(?, password)
               WHERE id_user = ?`,
        values: [input.email, role, input.isActive, hashedPassword, idUser],
      });

      // Keluarkan paksa dari semua perangkat bila akses berubah (kecuali akun sendiri)
      const aksesBerubah = !input.isActive || role !== current.role || hashedPassword !== null;
      if (aksesBerubah && !isSelf) {
        await conn.execute({
          sql: "DELETE FROM user_sessions WHERE id_user = ?",
          values: [idUser],
        });
      }
    });

    return { success: true, message: "Akun berhasil diperbarui." };
  } catch (err) {
    if (err instanceof AkunError) return { success: false, error: err.message };
    if (isMySQLDuplicateError(err)) {
      return { success: false, error: "Email sudah dipakai akun lain." };
    }
    return handleServiceError(err, "Terjadi kesalahan saat memperbarui akun.");
  }
};

export const deleteAkunService = async (
  idUser: string,
  actorIdUser: string,
): Promise<ActionResponse> => {
  try {
    if (idUser === actorIdUser) {
      return { success: false, error: "Akun Anda tidak dapat dihapus saat sedang digunakan." };
    }

    await mysqlTransaction(async (conn) => {
      const [rows] = await conn.execute<RowDataPacket[]>({
        sql: "SELECT role, is_active FROM users WHERE id_user = ? FOR UPDATE",
        values: [idUser],
      });
      const current = rows[0];
      if (!current) throw new AkunError("Akun tidak ditemukan.");

      if (
        current.role === "super_admin" &&
        current.is_active &&
        (await countOtherActiveSuperAdmins(conn, idUser)) === 0
      ) {
        throw new AkunError("Minimal harus ada satu Super Admin aktif.");
      }

      // FK: karyawan.id_user → NULL, user_sessions & hak_akses ikut terhapus
      await conn.execute({ sql: "DELETE FROM users WHERE id_user = ?", values: [idUser] });
    });

    return { success: true, message: "Akun berhasil dihapus." };
  } catch (err) {
    if (err instanceof AkunError) return { success: false, error: err.message };
    return handleServiceError(err, "Terjadi kesalahan saat menghapus akun.");
  }
};
