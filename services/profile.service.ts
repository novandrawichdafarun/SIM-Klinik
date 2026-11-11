import { RowDataPacket } from "mysql2";
import { getMySQLPool } from "@/database/mysql-client";
import { ActionResponse } from "@/types/action";
import { UserProfile } from "@/types/profile";
import { handleServiceError } from "@/utils/error";

export const getProfileService = async (
  idUser: string,
): Promise<ActionResponse<UserProfile>> => {
  try {
    const pool = getMySQLPool();

    // LEFT JOIN: akun tanpa data karyawan (mis. super_admin) tetap terbaca
    const [rows] = await pool.execute<RowDataPacket[]>({
      sql: `SELECT u.id_user, u.email, u.role, k.namaLengkap, k.jenisKaryawan
         FROM users u
         LEFT JOIN karyawan k ON k.id_user = u.id_user
         WHERE u.id_user = ? LIMIT 1`,
      values: [idUser],
    });

    const row = rows[0];
    if (!row) {
      return { success: false, error: "Profil pengguna tidak ditemukan." };
    }

    return {
      success: true,
      data: {
        id: row.id_user,
        email: row.email,
        role: row.role,
        namaLengkap: row.namaLengkap ?? null,
        jenisKaryawan: row.jenisKaryawan ?? null,
      },
    };
  } catch (err) {
    return handleServiceError(
      err,
      "Terjadi kesalahan internal saat mengambil profil.",
    );
  }
};
