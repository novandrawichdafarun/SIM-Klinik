import mysql, { type Pool } from "mysql2/promise";

declare global {
  // cache pool across module reloads (HMR) in dev
  var __mysqlPool: Pool | undefined;
}
let pool: Pool | null = null;

/**
 * MySQL connection pool singleton.
 * Lazy-init: pool dibuat pada panggilan pertama.
 * Uses global.__mysqlPool so HMR/dev doesn't create many pools.
 */
export function getMySQLPool(): Pool {
  if (typeof global !== "undefined" && globalThis.__mysqlPool)
    return globalThis.__mysqlPool as Pool;

  if (pool) return pool;

  const host = process.env.MYSQL_HOST;
  const user = process.env.MYSQL_USER;
  const database = process.env.MYSQL_DATABASE;

  if (!host || !user || !database) {
    throw new Error(
      "[MySQL] Env vars tidak lengkap. Wajib set MYSQL_HOST, MYSQL_USER, MYSQL_DATABASE.",
    );
  }

  pool = mysql.createPool({
    host,
    port: parseInt(process.env.MYSQL_PORT || "3306"),
    user,
    password: process.env.MYSQL_PASSWORD ?? "", // default = kosong
    database,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    //! Konsistensi timezone dengan schema (UTC)
    timezone: "Z",
    dateStrings: false,
    //? TINYINT(1) → boolean (imitasi PostgreSQL BOOLEAN)
    typeCast: (field, next) => {
      if (field.type === "TINY" && field.length === 1) {
        const val = field.string();
        return val === null ? null : val === "1";
      }
      if (
        field.type === "DATE" ||
        field.type === "DATETIME" ||
        field.type === "TIMESTAMP"
      ) {
        return field.string();
      }
      if (field.type === "NEWDECIMAL" || field.type === "DECIMAL") {
        const val = field.string();
        return val === null ? null : Number(val);
      }
      return next();
    },
    ssl:
      process.env.MYSQL_SSL === "true"
        ? { rejectUnauthorized: true }
        : undefined,
  });

  if (typeof global !== "undefined") globalThis.__mysqlPool = pool;
  return pool;
}
