import { randomBytes } from "crypto";
import { RowDataPacket, ResultSetHeader } from "mysql2";
import { getMySQLPool } from "@/database/mysql-client";
import { ActionResponse } from "@/types/action";
import type { UserRole } from "@/types/auth";
import type {
  Karyawan,
  KaryawanDetail,
  KaryawanFormValues,
  KaryawanListParams,
  KaryawanListResult,
  KaryawanOption,
  Poli,
} from "@/types/karyawan";
import type { KaryawanInput } from "@/schemas/karyawan.schema";
import { handleServiceError } from "@/utils/error";
import { generateNip, isJabatanPimpinan } from "@/utils/format";
import { isMySQLDuplicateError, mysqlTransaction } from "@/utils/mysql";

const SELECT_KARYAWAN = `
  SELECT k.idKaryawan, k.namaLengkap, k.NIP, k.NIK, k.jenisKaryawan,
         k.noHp, k.statusAktif, k.STR, k.SIP, k.idPoli, k.id_user,
         u.role, u.is_active, u.email, u.last_login_at,
         p.namaPoli
    FROM karyawan k
    LEFT JOIN users u ON u.id_user = k.id_user
    LEFT JOIN poli p ON p.idPoli = k.idPoli`;

function toKaryawan(row: RowDataPacket): Karyawan {
  return {
    idKaryawan: row.idKaryawan,
    namaLengkap: row.namaLengkap,
    NIP: row.NIP,
    NIK: row.NIK,
    jenisKaryawan: row.jenisKaryawan,
    noHp: row.noHp,
    statusAktif: row.statusAktif,
    STR: row.STR,
    SIP: row.SIP,
    idUser: row.id_user ?? null,
    role: (row.role as UserRole | null) ?? null,
    akunAktif: row.is_active ?? null,
    namaPoli: row.namaPoli,
  };
}

/** Pesan ramah untuk pelanggaran UNIQUE NIP / NIK */
function duplicateMessage(err: unknown): string | null {
  if (!isMySQLDuplicateError(err)) return null;
  const msg = (err as Error).message ?? "";
  if (msg.includes("uk_karyawan_nip")) return "NIP sudah dipakai karyawan lain.";
  if (msg.includes("uk_karyawan_nik")) return "NIK sudah terdaftar pada karyawan lain.";
  return "Data karyawan sudah ada.";
}

export const getKaryawanListService = async ({
  q,
  page,
  pageSize,
}: KaryawanListParams): Promise<ActionResponse<KaryawanListResult>> => {
  try {
    const pool = getMySQLPool();
    const keyword = q.trim();

    // WHERE hanya teks tetap; nilai keyword selalu lewat placeholder "?"
    const where = keyword
      ? "WHERE k.namaLengkap LIKE ? OR k.NIK LIKE ? OR k.NIP LIKE ? OR k.STR LIKE ?"
      : "";
    const whereValues = keyword ? Array(4).fill(`%${keyword}%`) : [];

    const [countRows] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS total FROM karyawan k ${where}`,
      whereValues,
    );
    const total = Number(countRows[0].total);

    // pool.query (bukan execute): prepared statement MySQL 8 menolak angka di LIMIT ?
    const [rows] = await pool.query<RowDataPacket[]>(
      `${SELECT_KARYAWAN}
        ${where}
        ORDER BY k.namaLengkap ASC
        LIMIT ? OFFSET ?`,
      [...whereValues, pageSize, (page - 1) * pageSize],
    );

    return {
      success: true,
      data: { items: rows.map(toKaryawan), total, page, pageSize },
    };
  } catch (err) {
    return handleServiceError(err, "Terjadi kesalahan saat mengambil data karyawan.");
  }
};

export const getKaryawanDetailService = async (
  idKaryawan: number,
): Promise<ActionResponse<KaryawanDetail>> => {
  try {
    const pool = getMySQLPool();
    const [rows] = await pool.execute<RowDataPacket[]>({
      sql: `${SELECT_KARYAWAN} WHERE k.idKaryawan = ? LIMIT 1`,
      values: [idKaryawan],
    });
    const row = rows[0];
    if (!row) return { success: false, error: "Karyawan tidak ditemukan." };

    let jumlahFiturAktif = 0;
    if (row.id_user) {
      if (row.role === "super_admin") {
        const [fitur] = await pool.query<RowDataPacket[]>("SELECT COUNT(*) AS total FROM fitur");
        jumlahFiturAktif = Number(fitur[0].total);
      } else {
        const [akses] = await pool.execute<RowDataPacket[]>({
          sql: `SELECT COUNT(*) AS total
                  FROM hak_akses h
                  JOIN fitur f ON f.kodeFitur = h.kodeFitur
                 WHERE h.id_user = ? AND f.khususSuperAdmin = FALSE
                   AND (h.bisaLihat OR h.bisaTambah OR h.bisaUbah OR h.bisaHapus)`,
          values: [row.id_user],
        });
        jumlahFiturAktif = Number(akses[0].total);
      }
    }

    return {
      success: true,
      data: {
        ...toKaryawan(row),
        idPoli: row.idPoli,
        email: row.email ?? null,
        lastLoginAt: row.last_login_at ?? null,
        jumlahFiturAktif,
      },
    };
  } catch (err) {
    return handleServiceError(err, "Terjadi kesalahan saat mengambil detail karyawan.");
  }
};

export const getKaryawanFormService = async (
  idKaryawan: number,
): Promise<ActionResponse<KaryawanFormValues>> => {
  try {
    const pool = getMySQLPool();
    const [rows] = await pool.execute<RowDataPacket[]>({
      sql: `SELECT idKaryawan, namaLengkap, NIP, NIK, jenisKaryawan, idPoli,
                   noHp, STR, SIP, statusAktif
              FROM karyawan WHERE idKaryawan = ? LIMIT 1`,
      values: [idKaryawan],
    });
    const row = rows[0];
    if (!row) return { success: false, error: "Karyawan tidak ditemukan." };
    return {
      success: true,
      data: {
        idKaryawan: row.idKaryawan,
        namaLengkap: row.namaLengkap,
        NIP: row.NIP,
        NIK: row.NIK,
        jenisKaryawan: row.jenisKaryawan,
        idPoli: row.idPoli,
        noHp: row.noHp,
        STR: row.STR,
        SIP: row.SIP,
        statusAktif: row.statusAktif,
      },
    };
  } catch (err) {
    return handleServiceError(err, "Terjadi kesalahan saat mengambil data karyawan.");
  }
};

export const createKaryawanService = async (
  input: KaryawanInput,
): Promise<ActionResponse<{ idKaryawan: number }>> => {
  try {
    // NIP otomatis dari idKaryawan. idKaryawan baru diketahui setelah INSERT, jadi:
    // INSERT dengan NIP sementara (TMP-...) lalu UPDATE ke KRY-xxxx dalam satu transaksi.
    const idKaryawan = await mysqlTransaction(async (conn) => {
      const [result] = await conn.execute<ResultSetHeader>({
        sql: `INSERT INTO karyawan
                (namaLengkap, NIP, NIK, jenisKaryawan, idPoli, noHp, STR, SIP, statusAktif)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        values: [
          input.namaLengkap,
          `TMP-${randomBytes(8).toString("hex")}`,
          input.NIK,
          input.jenisKaryawan,
          input.idPoli,
          input.noHp,
          input.STR,
          input.SIP,
          input.statusAktif,
        ],
      });
      await conn.execute({
        sql: "UPDATE karyawan SET NIP = ? WHERE idKaryawan = ?",
        values: [generateNip(result.insertId), result.insertId],
      });
      return result.insertId;
    });
    return { success: true, data: { idKaryawan } };
  } catch (err) {
    const dup = duplicateMessage(err);
    if (dup) return { success: false, error: dup };
    return handleServiceError(err, "Terjadi kesalahan saat menyimpan karyawan.");
  }
};

export const updateKaryawanService = async (
  idKaryawan: number,
  input: KaryawanInput,
): Promise<ActionResponse> => {
  try {
    const found = await mysqlTransaction(async (conn) => {
      const [rows] = await conn.execute<RowDataPacket[]>({
        sql: "SELECT id_user FROM karyawan WHERE idKaryawan = ? FOR UPDATE",
        values: [idKaryawan],
      });
      if (rows.length === 0) return false;

      await conn.execute({
        sql: `UPDATE karyawan
                 SET namaLengkap = ?, NIK = ?, jenisKaryawan = ?, idPoli = ?,
                     noHp = ?, STR = ?, SIP = ?, statusAktif = ?
               WHERE idKaryawan = ?`,
        values: [
          input.namaLengkap,
          input.NIK,
          input.jenisKaryawan,
          input.idPoli,
          input.noHp,
          input.STR,
          input.SIP,
          input.statusAktif,
          idKaryawan,
        ],
      });

      // Pimpinan Klinik selalu Super Admin
      if (isJabatanPimpinan(input.jenisKaryawan) && rows[0].id_user) {
        await conn.execute({
          sql: "UPDATE users SET role = 'super_admin' WHERE id_user = ?",
          values: [rows[0].id_user],
        });
      }

      // Karyawan dinonaktifkan → keluarkan dari semua perangkat
      if (!input.statusAktif && rows[0].id_user) {
        await conn.execute({
          sql: "DELETE FROM user_sessions WHERE id_user = ?",
          values: [rows[0].id_user],
        });
      }
      return true;
    });

    if (!found) return { success: false, error: "Karyawan tidak ditemukan." };
    return { success: true, message: "Data karyawan berhasil diperbarui." };
  } catch (err) {
    const dup = duplicateMessage(err);
    if (dup) return { success: false, error: dup };
    return handleServiceError(err, "Terjadi kesalahan saat memperbarui karyawan.");
  }
};

export const getPoliListService = async (): Promise<ActionResponse<Poli[]>> => {
  try {
    const pool = getMySQLPool();
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT idPoli, namaPoli FROM poli ORDER BY namaPoli ASC",
    );
    return {
      success: true,
      data: rows.map((r) => ({ idPoli: r.idPoli, namaPoli: r.namaPoli })),
    };
  } catch (err) {
    return handleServiceError(err, "Terjadi kesalahan saat mengambil data poli.");
  }
};

/** Karyawan aktif yang belum punya akun (untuk form Tambah Akun) */
export const getKaryawanTanpaAkunService = async (): Promise<ActionResponse<KaryawanOption[]>> => {
  try {
    const pool = getMySQLPool();
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT k.idKaryawan, k.namaLengkap, k.jenisKaryawan, p.namaPoli
         FROM karyawan k
         JOIN poli p ON p.idPoli = k.idPoli
        WHERE k.id_user IS NULL AND k.statusAktif = TRUE
        ORDER BY k.namaLengkap ASC`,
    );
    return {
      success: true,
      data: rows.map((r) => ({
        idKaryawan: r.idKaryawan,
        namaLengkap: r.namaLengkap,
        jenisKaryawan: r.jenisKaryawan,
        namaPoli: r.namaPoli,
      })),
    };
  } catch (err) {
    return handleServiceError(err, "Terjadi kesalahan saat mengambil data karyawan.");
  }
};
