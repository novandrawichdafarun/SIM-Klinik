import { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { getMySQLPool } from "@/database/mysql-client";
import type { Layanan, ServiceDiscountType } from "@/types/layanan";
import type { LayananInput } from "@/schemas/layanan.schema";
import type { ActionResponse } from "@/types/action";
import { handleServiceError } from "@/utils/error";
import { isMySQLDuplicateError } from "@/utils/mysql";

const select =
  "SELECT l.*, p.namaPoli FROM layanan l JOIN poli p ON p.idPoli = l.idPoli";
function map(row: RowDataPacket): Layanan {
  return {
    id: row.idLayanan,
    code: row.kodeLayanan,
    name: row.namaLayanan,
    poliId: row.idPoli,
    poli: row.namaPoli,
    category: row.kategori,
    price: Number(row.tarif),
    duration: row.estimasiDurasi,
    description: row.deskripsi ?? "",
    active: row.statusAktif,
    discount: {
      enabled: row.diskonAktif,
      eventName: row.namaEvent ?? "",
      type: row.jenisDiskon as ServiceDiscountType,
      value: Number(row.nilaiDiskon),
      startDate: row.mulaiDiskon ?? "",
      endDate: row.selesaiDiskon ?? "",
    },
  };
}
export async function getLayananListService(
  q = "",
  poli = "Semua",
  discount = false,
): Promise<ActionResponse<Layanan[]>> {
  try {
    const c: string[] = [];
    const v: unknown[] = [];
    if (q.trim()) {
      c.push("(l.namaLayanan LIKE ? OR l.kodeLayanan LIKE ?)");
      v.push(`%${q.trim()}%`, `%${q.trim()}%`);
    }
    if (poli !== "Semua") {
      c.push("p.namaPoli = ?");
      v.push(poli);
    } // `diskon` adalah kolom lama yang tetap dipelihara sebagai kompatibilitas migrasi.
    if (discount) c.push("l.diskon > 0");
    const [rows] = await getMySQLPool().query<RowDataPacket[]>(
      `${select}${c.length ? ` WHERE ${c.join(" AND ")}` : ""} ORDER BY l.idLayanan`,
      v,
    );
    return { success: true, data: rows.map(map) };
  } catch (e) {
    return handleServiceError(
      e,
      "Terjadi kesalahan saat mengambil katalog layanan.",
    );
  }
}
export async function getLayananByIdService(
  id: number,
): Promise<ActionResponse<Layanan>> {
  try {
    const [rows] = await getMySQLPool().execute<RowDataPacket[]>(
      `${select} WHERE l.idLayanan = ? LIMIT 1`,
      [id],
    );
    return rows[0]
      ? { success: true, data: map(rows[0]) }
      : { success: false, error: "Layanan tidak ditemukan." };
  } catch (e) {
    return handleServiceError(e, "Terjadi kesalahan saat mengambil layanan.");
  }
}
const params = (d: LayananInput) => [
  d.kodeLayanan,
  d.idPoli,
  d.namaLayanan,
  d.kategori,
  d.tarif,
  d.estimasiDurasi,
  d.deskripsi || null,
  d.statusAktif,
  d.diskonAktif,
  d.namaEvent || null,
  d.jenisDiskon,
  d.nilaiDiskon,
  d.mulaiDiskon || null,
  d.selesaiDiskon || null,
  d.diskonAktif && d.jenisDiskon === "persen" ? d.nilaiDiskon : 0,
];
export async function createLayananService(
  d: LayananInput,
): Promise<ActionResponse> {
  try {
    await getMySQLPool().execute(
      "INSERT INTO layanan (kodeLayanan,idPoli,namaLayanan,kategori,tarif,estimasiDurasi,deskripsi,statusAktif,diskonAktif,namaEvent,jenisDiskon,nilaiDiskon,mulaiDiskon,selesaiDiskon,porsiDokter,diskon) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,0,?)",
      params(d),
    );
    return { success: true, message: "Layanan berhasil ditambahkan." };
  } catch (e) {
    if (isMySQLDuplicateError(e))
      return { success: false, error: "Kode layanan sudah digunakan." };
    return handleServiceError(e, "Terjadi kesalahan saat menambahkan layanan.");
  }
}
export async function updateLayananService(
  id: number,
  d: LayananInput,
): Promise<ActionResponse> {
  try {
    await getMySQLPool().execute(
      "UPDATE layanan SET kodeLayanan=?,idPoli=?,namaLayanan=?,kategori=?,tarif=?,estimasiDurasi=?,deskripsi=?,statusAktif=?,diskonAktif=?,namaEvent=?,jenisDiskon=?,nilaiDiskon=?,mulaiDiskon=?,selesaiDiskon=?,diskon=? WHERE idLayanan=?",
      [...params(d), id],
    );
    return { success: true, message: "Layanan berhasil diperbarui." };
  } catch (e) {
    if (isMySQLDuplicateError(e))
      return { success: false, error: "Kode layanan sudah digunakan." };
    return handleServiceError(e, "Terjadi kesalahan saat memperbarui layanan.");
  }
}
export async function deleteLayananService(
  id: number,
): Promise<ActionResponse> {
  try {
    const [result] = await getMySQLPool().execute<ResultSetHeader>(
      "DELETE FROM layanan WHERE idLayanan = ?",
      [id],
    );
    return result.affectedRows
      ? { success: true, message: "Layanan berhasil dihapus." }
      : { success: false, error: "Layanan tidak ditemukan." };
  } catch (e) {
    return handleServiceError(
      e,
      "Layanan tidak dapat dihapus karena sudah digunakan.",
    );
  }
}
