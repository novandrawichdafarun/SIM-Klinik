import { getMySQLPool } from "@/database/mysql-client";
import type { PoolConnection } from "mysql2/promise";

/**
 * MySQL error codes (mysql2 mengembalikan `errno`).
 */
export const MYSQL_ERR = {
  DUP_ENTRY: 1062, // padanan PostgreSQL error code "23505"
  ROW_IS_REFERENCED: 1451,
  NO_REFERENCED_ROW: 1452,
  CHECK_CONSTRAINT_VIOLATED: 3819,
} as const;

/**
 * Cek apakah error adalah unique constraint violation.
 * Padanan PostgreSQL error code "23505".
 */
export function isMySQLDuplicateError(err: unknown): boolean {
  return (err as { errno?: number })?.errno === MYSQL_ERR.DUP_ENTRY;
}

/**
 * Wrapper transaction MySQL:
 * - auto BEGIN saat masuk
 * - auto COMMIT saat sukses
 * - auto ROLLBACK saat error
 * - selalu release connection di finally
 *
 * Contoh:
 *   await mysqlTransaction(async (conn) => {
 *     await conn.execute({ sql: "INSERT INTO users ...", values: [...] });
 *     await conn.execute({ sql: "INSERT INTO pasien ...", values: [...] });
 *   });
 */
export async function mysqlTransaction<T>(
  fn: (conn: PoolConnection) => Promise<T>,
): Promise<T> {
  const pool = getMySQLPool();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (err) {
    try {
      await conn.rollback();
    } catch {
      // rollback failure — error asli lebih penting
    }
    throw err;
  } finally {
    conn.release();
  }
}

/**
 * Normalisasi hasil JSON_ARRAYAGG dari MySQL:
 * - Jika null/undefined (LEFT JOIN 0 match) → []
 * - Jika string (belum di-parse) → parse
 * - Jika array (sudah di-parse mysql2) → passthrough
 * - Buang elemen null dari [null] artifact JSON_ARRAYAGG
 */
export function ensureArray<T>(value: unknown): T[] {
  if (value == null) return [];
  let arr: unknown[];
  if (Array.isArray(value)) {
    arr = value;
  } else if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      arr = Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  } else {
    return [];
  }
  return arr.filter((x) => x != null) as T[];
}
