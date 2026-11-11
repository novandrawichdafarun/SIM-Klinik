import { RowDataPacket } from "mysql2";
import { getMySQLPool } from "@/database/mysql-client";
import { ActionResponse } from "@/types/action";
import type { JabatanJasa, TarifLayanan } from "@/types/jasa";
import { handleServiceError } from "@/utils/error";
import { mysqlTransaction } from "@/utils/mysql";
import { hariIni } from "@/utils/format";
import { sinkronPemasukanLayanan } from "./pemasukan-klinik.service";

/**
 * Biaya tindakan medis = layanan.tarif, kolom yang diisi Katalog Layanan.
 * Semua query tarif & perolehan jasa memakai dua konstanta ini.
 */
export const BIAYA_JOIN = "";
export const BIAYA_SQL = "l.tarif";

/** Jasa = biaya tindakan × persentase, dibulatkan ke rupiah */
export function hitungJasa(biaya: number, persentase: number): number {
  return Math.round((biaya * persentase) / 100);
}

/**
 * Subquery persentase yang berlaku untuk satu tindakan & jabatan:
 *  1. tarif terbaru dengan berlakuMulai <= tanggal kunjungan, atau
 *  2. bila pada tanggal itu belum ada tarif sama sekali, tarif PERTAMA yang ditetapkan sesudahnya
 *     (supaya tindakan lama tetap terhitung walau tarif baru diatur belakangan).
 * Perubahan tarif berikutnya tidak mengubah tindakan yang sudah punya tarif.
 * Butuh alias `kj` (kunjungan) di query luar; `kolomLayanan` = kolom idLayanan tindakan
 * (default kunjungan_layanan `kl`).
 */
export function TARIF_BERLAKU_SQL(jabatan: JabatanJasa, kolomLayanan = "kl.idLayanan"): string {
  return `(SELECT t.persentase FROM tarif_jasa t
            WHERE t.idLayanan = ${kolomLayanan} AND t.jabatan = '${jabatan === "dokter" ? "dokter" : "perawat"}'
            ORDER BY (t.berlakuMulai <= kj.tglKunjungan) DESC,
                     ABS(DATEDIFF(t.berlakuMulai, kj.tglKunjungan)) ASC
            LIMIT 1)`;
}

/** Persentase yang berlaku HARI INI untuk satu layanan & jabatan (alias layanan: l) */
const TARIF_HARI_INI_SQL = (jabatan: JabatanJasa, kolom: "persentase" | "berlakuMulai") =>
  `(SELECT t.${kolom} FROM tarif_jasa t
     WHERE t.idLayanan = l.idLayanan AND t.jabatan = '${jabatan}'
       AND t.berlakuMulai <= CURDATE()
     ORDER BY t.berlakuMulai DESC LIMIT 1)`;

/** Semua layanan di katalog + pembagian persentase yang sedang berlaku */
export const getTarifLayananService = async (): Promise<ActionResponse<TarifLayanan[]>> => {
  try {
    const [rows] = await getMySQLPool().query<RowDataPacket[]>(
      `SELECT l.idLayanan, l.kodeLayanan, l.namaLayanan, l.statusAktif, p.namaPoli,
              ${BIAYA_SQL} AS biaya,
              ${TARIF_HARI_INI_SQL("dokter", "persentase")} AS persenDokter,
              ${TARIF_HARI_INI_SQL("perawat", "persentase")} AS persenPerawat,
              GREATEST(
                COALESCE(${TARIF_HARI_INI_SQL("dokter", "berlakuMulai")}, '1000-01-01'),
                COALESCE(${TARIF_HARI_INI_SQL("perawat", "berlakuMulai")}, '1000-01-01')
              ) AS berlakuMulai
         FROM layanan l
         JOIN poli p ON p.idPoli = l.idPoli
         ${BIAYA_JOIN}
        ORDER BY p.namaPoli DESC, l.namaLayanan ASC`,
    );
    return {
      success: true,
      data: rows.map((r) => {
        const berlaku = String(r.berlakuMulai).slice(0, 10);
        return {
          idLayanan: r.idLayanan,
          kodeLayanan: r.kodeLayanan,
          namaLayanan: r.namaLayanan,
          namaPoli: r.namaPoli,
          aktif: r.statusAktif !== false,
          biaya: Number(r.biaya),
          persenDokter: r.persenDokter === null ? null : Number(r.persenDokter),
          persenPerawat: r.persenPerawat === null ? null : Number(r.persenPerawat),
          berlakuMulai: berlaku === "1000-01-01" ? null : berlaku,
        };
      }),
    };
  } catch (err) {
    return handleServiceError(err, "Terjadi kesalahan saat mengambil tarif jasa.");
  }
};

class TarifError extends Error {}

/**
 * Tetapkan pembagian jasa satu layanan mulai hari ini: dokter % + perawat %,
 * sisanya otomatis menjadi pemasukan klinik. Riwayat tarif lama tetap disimpan,
 * dan pemasukan klinik untuk tindakan sejak hari ini dihitung ulang.
 */
export const setPembagianJasaService = async (
  input: { idLayanan: number; persenDokter: number; persenPerawat: number },
  actorIdUser: string,
): Promise<ActionResponse<{ disinkronkan: number }>> => {
  try {
    if (input.persenDokter + input.persenPerawat > 100) {
      throw new TarifError("Total persentase dokter dan perawat tidak boleh lebih dari 100%.");
    }
    const today = hariIni();

    const disinkronkan = await mysqlTransaction(async (conn) => {
      const [layanan] = await conn.execute<RowDataPacket[]>(
        "SELECT idLayanan FROM layanan WHERE idLayanan = ? FOR UPDATE",
        [input.idLayanan],
      );
      if (!layanan[0]) throw new TarifError("Layanan tidak ditemukan.");

      for (const [jabatan, persen] of [
        ["dokter", input.persenDokter],
        ["perawat", input.persenPerawat],
      ] as const) {
        await conn.execute(
          `INSERT INTO tarif_jasa (idLayanan, jabatan, persentase, berlakuMulai, dibuatOleh)
           VALUES (?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE persentase = VALUES(persentase), dibuatOleh = VALUES(dibuatOleh)`,
          [input.idLayanan, jabatan, persen, today, actorIdUser],
        );
      }

      return sinkronPemasukanLayanan(conn, input.idLayanan);
    });

    return {
      success: true,
      data: { disinkronkan },
      message: "Pembagian jasa berhasil disimpan.",
    };
  } catch (err) {
    if (err instanceof TarifError) return { success: false, error: err.message };
    return handleServiceError(err, "Terjadi kesalahan saat menyimpan tarif jasa.");
  }
};
