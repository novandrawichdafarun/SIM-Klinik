import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { RowDataPacket } from "mysql2";
import { OtpPayload, ResetPasswordPayload, UserAuthData } from "@/types/auth";
import { ActionResponse } from "@/types/action";
import { handleServiceError } from "@/utils/error";
import { getMySQLPool } from "@/database/mysql-client";
import { sendOtpEmail } from "./mail.service";

export const loginUserService = async (
  email: string,
  password: string,
  userAgent: string,
): Promise<ActionResponse<UserAuthData>> => {
  try {
    const pool = getMySQLPool();

    const [userRows] = await pool.execute<RowDataPacket[]>({
      sql: `SELECT id_user, email, password_hash, role
         FROM users WHERE email = ? LIMIT 1`,
      values: [email],
    });
    const user = userRows[0];
    if (!user) {
      return {
        success: false,
        error: "Kredensial tidak valid (Email tidak ditemukan)",
      };
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return {
        success: false,
        error: "Kredensial tidak valid (Kata sandi salah)",
      };
    }

    const newSessionToken = randomUUID();

    const [sessions] = await pool.execute<RowDataPacket[]>({
      sql: `SELECT id, session_token FROM user_sessions
         WHERE id_user = ? ORDER BY last_active_at ASC`,
      values: [user.id_user],
    });

    if (sessions.length >= 3) {
      const overLimitCount = sessions.length - 2;
      const tokensToKick = sessions
        .slice(0, overLimitCount)
        .map((s) => s.session_token);

      for (const token of tokensToKick) {
        await pool.execute({
          sql: "DELETE FROM user_sessions WHERE session_token = ?",
          values: [token],
        });
      }
    }

    await pool.execute({
      sql: `INSERT INTO user_sessions (id_user, session_token, device_info)
         VALUES (?, ?, ?)`,
      values: [user.id_user, newSessionToken, userAgent],
    });

    return {
      success: true,
      data: {
        id: user.id_user,
        email: user.email,
        role: user.role,
        sessionToken: newSessionToken,
      },
    };
  } catch (err) {
    return handleServiceError(err, "Terjadi kesalahan internal saat login.");
  }
};

export const clearDbSessionService = async (
  sessionToken: string,
): Promise<ActionResponse> => {
  try {
    const pool = getMySQLPool();
    await pool.execute({
      sql: "DELETE FROM user_sessions WHERE session_token = ?",
      values: [sessionToken],
    });
    return { success: true };
  } catch (err) {
    return handleServiceError(
      err,
      "Terjadi kesalahan internal saat menghapus session.",
    );
  }
};

export const requestPasswordReset = async (
  email: string,
): Promise<ActionResponse> => {
  try {
    const pool = getMySQLPool();

    const [userRows] = await pool.execute<RowDataPacket[]>({
      sql: "SELECT email FROM users WHERE email = ? LIMIT 1",
      values: [email],
    });
    if (userRows.length === 0) {
      return { success: false, error: "Email tidak terdaftar di sistem." };
    }

    const [recentRequests] = await pool.execute<RowDataPacket[]>({
      sql: "SELECT id FROM password_resets WHERE email = ? AND expires_at > DATE_ADD(NOW(), INTERVAL 4 MINUTE) LIMIT 1",
      values: [email],
    });

    if (recentRequests.length > 0) {
      return {
        success: false,
        error: "Tunggu 1 menit sebelum meminta kode OTP baru.",
      };
    }

    await pool.execute({
      sql: `DELETE FROM password_resets
         WHERE email = ? OR expires_at < NOW()`,
      values: [email],
    });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const salt = await bcrypt.genSalt(10);
    const hashedOtp = await bcrypt.hash(otp, salt);

    await pool.execute({
      sql: `INSERT INTO password_resets (email, token, expires_at)
         VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 5 MINUTE))`,
      values: [email, hashedOtp],
    });

    const emailResult = await sendOtpEmail({
      to: email,
      otpCode: otp,
    });

    if (!emailResult.success) {
      return {
        success: false,
        error:
          "Gagal mengirim email OTP. Silakan periksa konfigurasi server email kamu.",
      };
    }

    return { success: true, message: "Kode OTP telah dikirim ke email." };
  } catch (err) {
    return handleServiceError(
      err,
      "Terjadi kesalahan internal saat membuat/mengirim kode otp.",
    );
  }
};

export const verifyOtp = async (
  payload: OtpPayload,
): Promise<ActionResponse> => {
  try {
    const { email, token } = payload;
    const pool = getMySQLPool();
    const [rows] = await pool.execute<RowDataPacket[]>({
      sql: "SELECT token FROM password_resets WHERE email = ? AND expires_at >= NOW() LIMIT 1",
      values: [email],
    });

    if (rows.length === 0) {
      return {
        success: false,
        error: "Kode OTP salah atau sudah kadaluarsa",
      };
    }
    const hashedOtp = rows[0].token;
    const isValidOtp = await bcrypt.compare(token, hashedOtp);

    if (!isValidOtp) {
      return {
        success: false,
        error: "Kode OTP salah atau sudah kadaluarsa",
      };
    }
    return { success: true, message: "Kode OTP valid." };
  } catch (err) {
    return handleServiceError(
      err,
      "Terjadi kesalahan internal verifikasi kode otp.",
    );
  }
};

export const ResetPassword = async (
  payload: ResetPasswordPayload,
): Promise<ActionResponse> => {
  try {
    const { email, token, newPassword } = payload;
    const pool = getMySQLPool();

    const [rows] = await pool.execute<RowDataPacket[]>({
      sql: "SELECT id, token FROM password_resets WHERE email = ? AND expires_at >= NOW() LIMIT 1",
      values: [email],
    });

    if (rows.length === 0) {
      return {
        success: false,
        error: "Akses ditolak Token tidak sah atau kedaluwarsa.",
      };
    }

    const resetId = rows[0].id;
    const hashedOtp = rows[0].token;
    const isValidOtp = await bcrypt.compare(token, hashedOtp);

    if (!isValidOtp) {
      return {
        success: false,
        error: "Akses ditolak Token tidak sah atau kedaluwarsa.",
      };
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      await conn.execute({
        sql: "UPDATE users SET password_hash = ? WHERE email = ?",
        values: [hashedPassword, email],
      });
      await conn.execute({
        sql: "DELETE FROM password_resets WHERE id = ?",
        values: [resetId],
      });
      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }

    return {
      success: true,
      message: "Kata sandi berhasil diubah. Silakan login kembali.",
    };
  } catch (err) {
    return handleServiceError(
      err,
      "Terjadi kesalahan internal saat memperbarui password.",
    );
  }
};
