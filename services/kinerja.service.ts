import { RowDataPacket } from "mysql2";
import { getMySQLPool } from "@/database/mysql-client";
import { ActionResponse } from "@/types/action";
import type {
  KinerjaDokter,
  NilaiBulanan,
  PeriodeKinerja,
  RatingDokterStats,
  RiwayatDitangani,
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
function lengkapiBulan(daftarBulan: string[], rows: RowDataPacket[]): NilaiBulanan[] {
  const map = new Map(rows.map((r) => [r.bulan as string, Number(r.nilai)]));
  return daftarBulan.map((bulan) => ({ bulan, nilai: map.get(bulan) ?? null }));
}

const ER_NO_SUCH_TABLE = 1146;

/** Rating per karyawan: nilai dokter & nilai perawat dari setiap penilaian kunjungan */
const RATING_KARYAWAN = `(
  SELECT idRating, idDokter AS idKaryawan, nilaiDokter AS nilai, ulasan, created_at
    FROM rating_kunjungan
  UNION ALL
  SELECT idRating, idPerawat, nilaiPerawat, ulasan, created_at
    FROM rating_kunjungan WHERE idPerawat IS NOT NULL
) rk`;

const RATING_KOSONG = (periode: PeriodeKinerja): RatingDokterStats => ({
  rataRata: null,
  jumlahUlasan: 0,
  distribusi: [0, 0, 0, 0, 0],
  ratingPerBulan: periode.daftarBulan.map((bulan) => ({ bulan, nilai: null })),
  ulasanTerbaru: [],
});

/**
 * Statistik rating karyawan (dokter atau perawat) dari tabel `rating_kunjungan`.
 * Selama fitur rating pengunjung belum berjalan, tabel kosong → semua nilai kosong.
 */
export const getRatingDokterService = async (
  idDokter: number,
  periode: PeriodeKinerja,
): Promise<ActionResponse<RatingDokterStats>> => {
  try {
    const pool = getMySQLPool();
    const values = [idDokter, periode.mulai];

    const [[ringkasan], [distribusiRows], [bulananRows], [ulasanRows]] = await Promise.all([
      pool.execute<RowDataPacket[]>({
        sql: `SELECT AVG(nilai) AS rataRata, COUNT(*) AS jumlah
                  FROM ${RATING_KARYAWAN}
                 WHERE idKaryawan = ? AND created_at >= ?`,
        values,
      }),
      pool.execute<RowDataPacket[]>({
        sql: `SELECT nilai, COUNT(*) AS jumlah
                  FROM ${RATING_KARYAWAN}
                 WHERE idKaryawan = ? AND created_at >= ?
                 GROUP BY nilai`,
        values,
      }),
      pool.execute<RowDataPacket[]>({
        sql: `SELECT DATE_FORMAT(created_at, '%Y-%m') AS bulan, AVG(nilai) AS nilai
                  FROM ${RATING_KARYAWAN}
                 WHERE idKaryawan = ? AND created_at >= ?
                 GROUP BY bulan`,
        values,
      }),
      pool.execute<RowDataPacket[]>({
        sql: `SELECT idRating, nilai, ulasan, created_at
                  FROM ${RATING_KARYAWAN}
                 WHERE idKaryawan = ? AND created_at >= ?
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
    // Ditangani = dokter penanggung jawab yang sudah mengisi diagnosa, atau perawat pemeriksa
    const DITANGANI = "((rm.idDokter = ? AND rm.diagnosa IS NOT NULL) OR rm.idPerawat = ?)";
    const values = [idDokter, idDokter, periode.mulai];

    const [[totalRows], [bulananRows], [layananRows]] = await Promise.all([
      pool.execute<RowDataPacket[]>({
        sql: `SELECT COUNT(*) AS total
                FROM rekam_medis rm
                JOIN kunjungan kj ON kj.idKunjungan = rm.idKunjungan
               WHERE ${DITANGANI} AND kj.tglKunjungan >= ?`,
        values,
      }),
      pool.execute<RowDataPacket[]>({
        sql: `SELECT DATE_FORMAT(kj.tglKunjungan, '%Y-%m') AS bulan, COUNT(*) AS nilai
                FROM rekam_medis rm
                JOIN kunjungan kj ON kj.idKunjungan = rm.idKunjungan
               WHERE ${DITANGANI} AND kj.tglKunjungan >= ?
               GROUP BY bulan`,
        values,
      }),
      pool.execute<RowDataPacket[]>({
        sql: `SELECT l.namaLayanan, COUNT(*) AS jumlah
                FROM rekam_medis rm
                JOIN kunjungan kj ON kj.idKunjungan = rm.idKunjungan
                JOIN kunjungan_layanan kl ON kl.idKunjungan = kj.idKunjungan
                JOIN layanan l ON l.idLayanan = kl.idLayanan
               WHERE ${DITANGANI} AND kj.tglKunjungan >= ?
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

/**
 * Kunjungan terakhir yang ditangani karyawan pada periode: sebagai dokter penanggung jawab
 * (sudah didiagnosa) atau perawat pemeriksa. Diagnosa hanya dikirim bila `denganDiagnosa`.
 */
export const getRiwayatDitanganiService = async (
  idKaryawan: number,
  periode: PeriodeKinerja,
  denganDiagnosa: boolean,
): Promise<ActionResponse<RiwayatDitangani[]>> => {
  try {
    const [rows] = await getMySQLPool().query<RowDataPacket[]>(
      `SELECT kj.idKunjungan, kj.kodeKunjungan, DATE_FORMAT(kj.tglKunjungan, '%Y-%m-%d') AS tanggal,
              p.idPasien, p.namaLengkap AS namaPasien, p.NoRM, po.namaPoli, rm.diagnosa,
              IF(rm.idDokter = ? AND rm.diagnosa IS NOT NULL, 'dokter', 'perawat') AS peran,
              COALESCE(
                (SELECT GROUP_CONCAT(l2.namaLayanan ORDER BY kl.idKunjunganLayanan SEPARATOR ', ')
                   FROM kunjungan_layanan kl JOIN layanan l2 ON l2.idLayanan = kl.idLayanan
                  WHERE kl.idKunjungan = kj.idKunjungan),
                '-') AS namaLayanan
         FROM rekam_medis rm
         JOIN kunjungan kj ON kj.idKunjungan = rm.idKunjungan
         JOIN pasien p ON p.idPasien = kj.idPasien
         JOIN poli po ON po.idPoli = kj.idPoli
        WHERE ((rm.idDokter = ? AND rm.diagnosa IS NOT NULL) OR rm.idPerawat = ?)
          AND kj.tglKunjungan >= ?
        ORDER BY kj.tglKunjungan DESC, kj.jamKunjungan DESC
        LIMIT 10`,
      [idKaryawan, idKaryawan, idKaryawan, periode.mulai],
    );
    return {
      success: true,
      data: rows.map((r) => ({
        idKunjungan: r.idKunjungan,
        kodeKunjungan: r.kodeKunjungan,
        tanggal: r.tanggal,
        idPasien: r.idPasien,
        namaPasien: r.namaPasien,
        NoRM: r.NoRM,
        namaPoli: r.namaPoli,
        namaLayanan: r.namaLayanan,
        peran: r.peran,
        diagnosa: denganDiagnosa ? (r.diagnosa ?? null) : null,
      })),
    };
  } catch (err) {
    return handleServiceError(err, "Terjadi kesalahan saat mengambil riwayat penanganan.");
  }
};
