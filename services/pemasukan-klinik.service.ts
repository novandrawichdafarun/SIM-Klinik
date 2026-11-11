import { PoolConnection, ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { hitungJasa, TARIF_BERLAKU_SQL } from "./tarif-jasa.service";

/**
 * Pembagian biaya satu tindakan:
 *   jasa dokter  = biaya × persentase dokter
 *   jasa perawat = biaya × persentase perawat (hanya bila ada perawat pendamping)
 *   pemasukan klinik = sisa biaya setelah jasa
 * Tarif yang dipakai adalah yang berlaku pada tanggal kunjungan.
 */
export interface PembagianBiaya {
  biaya: number;
  persenDokter: number | null;
  persenPerawat: number | null;
  jasaDokter: number;
  jasaPerawat: number;
  pemasukanKlinik: number;
}

export function hitungPembagian(
  biaya: number,
  persenDokter: number | null,
  persenPerawat: number | null,
  adaPerawat: boolean,
): PembagianBiaya {
  const jasaDokter = persenDokter === null ? 0 : hitungJasa(biaya, persenDokter);
  const jasaPerawat = adaPerawat && persenPerawat !== null ? hitungJasa(biaya, persenPerawat) : 0;
  return {
    biaya,
    persenDokter,
    persenPerawat,
    jasaDokter,
    jasaPerawat,
    pemasukanKlinik: Math.max(0, biaya - jasaDokter - jasaPerawat),
  };
}

/**
 * Catat / perbarui pemasukan klinik (tabel keuangan) untuk satu rekam medis.
 * Dijumlahkan dari semua tindakan kunjungan (kunjungan_layanan):
 *   pemasukan = Σ (biaya − jasa dokter − jasa perawat)
 * Dipanggil saat pemeriksaan/diagnosa disimpan dan saat tarif jasa diubah.
 */
export async function sinkronPemasukanKlinik(
  conn: PoolConnection,
  idRekamMedis: number,
): Promise<PembagianBiaya | null> {
  const [rows] = await conn.query<RowDataPacket[]>(
    `SELECT rm.idRekamMedis, rm.idPerawat, rm.idPemasukan, kj.tglKunjungan,
            l.namaLayanan, l.tarif AS biaya,
            ${TARIF_BERLAKU_SQL("dokter")} AS persenDokter,
            ${TARIF_BERLAKU_SQL("perawat")} AS persenPerawat
       FROM rekam_medis rm
       JOIN kunjungan kj ON kj.idKunjungan = rm.idKunjungan
       JOIN kunjungan_layanan kl ON kl.idKunjungan = kj.idKunjungan
       JOIN layanan l ON l.idLayanan = kl.idLayanan
      WHERE rm.idRekamMedis = ?
      ORDER BY kl.idKunjunganLayanan`,
    [idRekamMedis],
  );
  if (rows.length === 0) return null;
  const r0 = rows[0];

  // Jumlahkan pembagian semua tindakan
  const total: PembagianBiaya = {
    biaya: 0,
    persenDokter: null,
    persenPerawat: null,
    jasaDokter: 0,
    jasaPerawat: 0,
    pemasukanKlinik: 0,
  };
  for (const r of rows) {
    const p = hitungPembagian(
      Number(r.biaya),
      r.persenDokter === null ? null : Number(r.persenDokter),
      r.persenPerawat === null ? null : Number(r.persenPerawat),
      r0.idPerawat !== null,
    );
    total.biaya += p.biaya;
    total.jasaDokter += p.jasaDokter;
    total.jasaPerawat += p.jasaPerawat;
    total.pemasukanKlinik += p.pemasukanKlinik;
  }

  const tanggal = String(r0.tglKunjungan).slice(0, 10);
  const nama = rows.map((r) => r.namaLayanan).join(", ");
  const jenis = `Pemasukan klinik: ${nama}`.slice(0, 100);

  if (r0.idPemasukan) {
    await conn.execute(
      "UPDATE keuangan SET jenisTransaksi = ?, nominal = ?, tglTransaksi = ? WHERE idTransaksi = ?",
      [jenis, total.pemasukanKlinik, tanggal, r0.idPemasukan],
    );
  } else {
    const [ins] = await conn.execute<ResultSetHeader>(
      `INSERT INTO keuangan (jenisTransaksi, kategori, nominal, tglTransaksi)
       VALUES (?, 'Jasa Layanan Klinik', ?, ?)`,
      [jenis, total.pemasukanKlinik, tanggal],
    );
    await conn.execute("UPDATE rekam_medis SET idPemasukan = ? WHERE idRekamMedis = ?", [
      ins.insertId,
      idRekamMedis,
    ]);
  }
  return total;
}

/**
 * Sinkronkan ulang semua rekam medis yang memakai suatu layanan. Semua tanggal ikut dihitung,
 * karena tarif pertama juga berlaku untuk tindakan lama yang sebelumnya belum punya tarif;
 * tindakan yang sudah punya tarif lama hasilnya tetap sama.
 */
export async function sinkronPemasukanLayanan(
  conn: PoolConnection,
  idLayanan: number,
): Promise<number> {
  const [rows] = await conn.execute<RowDataPacket[]>(
    `SELECT DISTINCT rm.idRekamMedis
       FROM rekam_medis rm
       JOIN kunjungan_layanan kl ON kl.idKunjungan = rm.idKunjungan
      WHERE kl.idLayanan = ?`,
    [idLayanan],
  );
  for (const r of rows) await sinkronPemasukanKlinik(conn, r.idRekamMedis);
  return rows.length;
}
