import { RowDataPacket } from "mysql2";
import { getMySQLPool } from "@/database/mysql-client";
import { ActionResponse } from "@/types/action";
import type {
  KinerjaDokter,
  NilaiBulanan,
  PeriodeKinerja,
  RatingDokterStats,
} from "@/types/kinerja";
import { handleServiceError } from "@/utils/error";

export const PERIODE_OPTIONS = [3, 6, 12] as const;

/** Periode N bulan terakhir (termasuk bulan berjalan) */
export function buatPeriode(bulan: number, now = new Date()): PeriodeKinerja {
  const daftarBulan: string[] = [];
  for (let i = bulan - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    daftarBulan.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return { bulan, mulai: `${daftarBulan[0]}-01`, daftarBulan };
}

/** Isi bulan yang tidak punya data dengan null supaya sumbu grafik tetap lengkap */
function lengkapiBulan(
  daftarBulan: string[],
  rows: RowDataPacket[],
): NilaiBulanan[] {
  const map = new Map(rows.map((r) => [r.bulan as string, Number(r.nilai)]));
  return daftarBulan.map((bulan) => ({ bulan, nilai: map.get(bulan) ?? null }));
}

const ER_NO_SUCH_TABLE = 1146;

const RATING_KOSONG = (periode: PeriodeKinerja): RatingDokterStats => ({
  rataRata: null,
  jumlahUlasan: 0,
  distribusi: [0, 0, 0, 0, 0],
  ratingPerBulan: periode.daftarBulan.map((bulan) => ({ bulan, nilai: null })),
  ulasanTerbaru: [],
});

/**
 * Statistik rating dokter dari tabel `rating_dokter`.
 * Selama fitur rating pengunjung belum berjalan, tabel kosong → semua nilai kosong.
 */
export const getRatingDokterService = async (
  idDokter: number,
  periode: PeriodeKinerja,
): Promise<ActionResponse<RatingDokterStats>> => {
  try {
    const pool = getMySQLPool();
    const values = [idDokter, periode.mulai];

    const [[ringkasan], [distribusiRows], [bulananRows], [ulasanRows]] =
      await Promise.all([
        pool.execute<RowDataPacket[]>({
          sql: `SELECT AVG(nilai) AS rataRata, COUNT(*) AS jumlah
                  FROM rating_dokter
                 WHERE idDokter = ? AND created_at >= ?`,
          values,
        }),
        pool.execute<RowDataPacket[]>({
          sql: `SELECT nilai, COUNT(*) AS jumlah
                  FROM rating_dokter
                 WHERE idDokter = ? AND created_at >= ?
                 GROUP BY nilai`,
          values,
        }),
        pool.execute<RowDataPacket[]>({
          sql: `SELECT DATE_FORMAT(created_at, '%Y-%m') AS bulan, AVG(nilai) AS nilai
                  FROM rating_dokter
                 WHERE idDokter = ? AND created_at >= ?
                 GROUP BY bulan`,
          values,
        }),
        pool.execute<RowDataPacket[]>({
          sql: `SELECT idRating, nilai, ulasan, created_at
                  FROM rating_dokter
                 WHERE idDokter = ? AND created_at >= ?
                   AND ulasan IS NOT NULL AND TRIM(ulasan) <> ''
                 ORDER BY created_at DESC
                 LIMIT 4`,
          values,
        }),
      ]);

    const distribusi: RatingDokterStats["distribusi"] = [0, 0, 0, 0, 0];
    for (const row of distribusiRows) {
      const bintang = Number(row.nilai);
      if (bintang >= 1 && bintang <= 5) distribusi[bintang - 1] = Number(row.jumlah);
    }

    const jumlahUlasan = Number(ringkasan[0]?.jumlah ?? 0);
    return {
      success: true,
      data: {
        rataRata: jumlahUlasan > 0 ? Number(ringkasan[0].rataRata) : null,
        jumlahUlasan,
        distribusi,
        ratingPerBulan: lengkapiBulan(periode.daftarBulan, bulananRows),
        ulasanTerbaru: ulasanRows.map((r) => ({
          idRating: r.idRating,
          nilai: Number(r.nilai),
          ulasan: r.ulasan,
          tanggal: r.created_at,
        })),
      },
    };
  } catch (err) {
    // Database lama yang belum menjalankan migrasi rating → tampilkan kosong
    if ((err as { errno?: number })?.errno === ER_NO_SUCH_TABLE) {
      return { success: true, data: RATING_KOSONG(periode) };
    }
    return handleServiceError(err, "Terjadi kesalahan saat mengambil rating dokter.");
  }
};

/** Kinerja dokter dari rekam_medis (1 rekam medis = 1 kunjungan pasien yang ditangani) */
export const getKinerjaDokterService = async (
  idDokter: number,
  periode: PeriodeKinerja,
): Promise<ActionResponse<KinerjaDokter>> => {
  try {
    const pool = getMySQLPool();
    const values = [idDokter, periode.mulai];

    const [[totalRows], [bulananRows], [layananRows]] = await Promise.all([
      pool.execute<RowDataPacket[]>({
        sql: `SELECT COUNT(*) AS total
                FROM rekam_medis rm
                JOIN kunjungan kj ON kj.idKunjungan = rm.idKunjungan
               WHERE rm.idDokter = ? AND kj.tglKunjungan >= ?`,
        values,
      }),
      pool.execute<RowDataPacket[]>({
        sql: `SELECT DATE_FORMAT(kj.tglKunjungan, '%Y-%m') AS bulan, COUNT(*) AS nilai
                FROM rekam_medis rm
                JOIN kunjungan kj ON kj.idKunjungan = rm.idKunjungan
               WHERE rm.idDokter = ? AND kj.tglKunjungan >= ?
               GROUP BY bulan`,
        values,
      }),
      pool.execute<RowDataPacket[]>({
        sql: `SELECT l.namaLayanan, COUNT(*) AS jumlah
                FROM rekam_medis rm
                JOIN kunjungan kj ON kj.idKunjungan = rm.idKunjungan
                JOIN layanan l ON l.idLayanan = kj.idLayanan
               WHERE rm.idDokter = ? AND kj.tglKunjungan >= ?
               GROUP BY l.idLayanan, l.namaLayanan
               ORDER BY jumlah DESC
               LIMIT 5`,
        values,
      }),
    ]);

    return {
      success: true,
      data: {
        pasienDitangani: Number(totalRows[0]?.total ?? 0),
        pasienPerBulan: lengkapiBulan(periode.daftarBulan, bulananRows).map((b) => ({
          ...b,
          nilai: b.nilai ?? 0, // bulan tanpa kunjungan = 0 pasien
        })),
        layananDitangani: layananRows.map((r) => ({
          namaLayanan: r.namaLayanan,
          jumlah: Number(r.jumlah),
        })),
      },
    };
  } catch (err) {
    return handleServiceError(err, "Terjadi kesalahan saat mengambil kinerja dokter.");
  }
};
