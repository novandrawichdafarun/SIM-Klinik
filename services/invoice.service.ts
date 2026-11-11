import { randomBytes } from "crypto";
import { ResultSetHeader, RowDataPacket } from "mysql2";
import { getMySQLPool } from "@/database/mysql-client";
import { ActionResponse } from "@/types/action";
import type {
  InvoiceData,
  InvoiceItem,
  KunjunganTagihan,
  RatingKunjungan,
  RingkasanInvoice,
} from "@/types/invoice";
import type { RatingInput } from "@/schemas/invoice.schema";
import { handleServiceError } from "@/utils/error";
import { mysqlTransaction } from "@/utils/mysql";

class InvoiceError extends Error {}

/** Diskon event (%) yang berlaku pada tanggal kunjungan, sama dengan aturan Katalog Layanan */
const DISKON_SQL = `IF(l.diskonAktif AND l.nilaiDiskon > 0
     AND (l.mulaiDiskon IS NULL OR l.mulaiDiskon <= kj.tglKunjungan)
     AND (l.selesaiDiskon IS NULL OR l.selesaiDiskon >= kj.tglKunjungan),
   l.nilaiDiskon, 0)`;

const rupiah = (n: number) => Math.round(n * 100) / 100;

/** Rincian tagihan dari tindakan kunjungan (tarif & diskon saat ini) */
function hitungItem(rows: RowDataPacket[]): InvoiceItem[] {
  return rows.map((r) => {
    const tarif = Number(r.tarif);
    const diskonPersen = Number(r.diskonPersen);
    const potongan = rupiah((tarif * diskonPersen) / 100);
    return {
      namaLayanan: r.namaLayanan,
      tarif,
      diskonPersen,
      potongan,
      subtotal: rupiah(tarif - potongan),
    };
  });
}

// ============================================================
// Daftar kunjungan selesai per tanggal
// ============================================================

export const getKunjunganTagihanService = async (
  tanggal: string,
  q: string,
): Promise<ActionResponse<{ items: KunjunganTagihan[]; ringkasan: RingkasanInvoice }>> => {
  try {
    const where = ["kj.tglKunjungan = ?", "kj.status = 'selesai'"];
    const values: unknown[] = [tanggal];
    const cari = q.trim();
    if (cari) {
      where.push(
        "(p.namaLengkap LIKE ? OR p.NoRM LIKE ? OR p.noHp LIKE ? OR i.nomorInvoice LIKE ?)",
      );
      values.push(...Array(4).fill(`%${cari}%`));
    }
    const pool = getMySQLPool();
    const [[rows], [klinik]] = await Promise.all([
      pool.query<RowDataPacket[]>(
        `SELECT kj.idKunjungan, kj.kodeKunjungan,
                DATE_FORMAT(kj.tglKunjungan, '%Y-%m-%d') AS tanggal,
                DATE_FORMAT(kj.jamKunjungan, '%H:%i') AS jam,
                p.namaLengkap AS namaPasien, p.NoRM, p.noHp, p.jenisPenjamin,
                d.namaLengkap AS namaDokter,
                i.idInvoice, i.nomorInvoice, i.statusKirim, i.totalBayar,
                (SELECT GROUP_CONCAT(l.namaLayanan ORDER BY kl.idKunjunganLayanan SEPARATOR ', ')
                   FROM kunjungan_layanan kl JOIN layanan l ON l.idLayanan = kl.idLayanan
                  WHERE kl.idKunjungan = kj.idKunjungan) AS namaLayanan,
                (SELECT COALESCE(SUM(l.tarif * (1 - ${DISKON_SQL} / 100)), 0)
                   FROM kunjungan_layanan kl JOIN layanan l ON l.idLayanan = kl.idLayanan
                  WHERE kl.idKunjungan = kj.idKunjungan) AS perkiraan,
                EXISTS (SELECT 1 FROM rating_kunjungan r WHERE r.idKunjungan = kj.idKunjungan) AS sudahRating
           FROM kunjungan kj
           JOIN pasien p ON p.idPasien = kj.idPasien
           LEFT JOIN karyawan d ON d.idKaryawan = kj.idDokter
           LEFT JOIN invoice i ON i.idKunjungan = kj.idKunjungan
          WHERE ${where.join(" AND ")}
          ORDER BY kj.jamKunjungan ASC, kj.idKunjungan ASC`,
        values,
      ),
      pool.query<RowDataPacket[]>(
        `SELECT AVG(nilaiKlinik) AS rata FROM rating_kunjungan
          WHERE created_at >= NOW() - INTERVAL 30 DAY`,
      ),
    ]);

    const items: KunjunganTagihan[] = rows.map((r) => ({
      idKunjungan: r.idKunjungan,
      kodeKunjungan: r.kodeKunjungan,
      tanggal: r.tanggal,
      jam: r.jam,
      namaPasien: r.namaPasien,
      NoRM: r.NoRM,
      noHp: r.noHp ?? null,
      jenisPenjamin: r.jenisPenjamin,
      namaLayanan: r.namaLayanan ?? "-",
      namaDokter: r.namaDokter ?? null,
      total: rupiah(Number(r.idInvoice ? r.totalBayar : r.perkiraan)),
      idInvoice: r.idInvoice ?? null,
      nomorInvoice: r.nomorInvoice ?? null,
      statusKirim: Boolean(r.statusKirim),
      sudahRating: Boolean(Number(r.sudahRating)),
    }));
    const rata = klinik[0]?.rata;
    return {
      success: true,
      data: {
        items,
        ringkasan: {
          kunjunganSelesai: items.length,
          invoiceDibuat: items.filter((i) => i.idInvoice).length,
          terkirim: items.filter((i) => i.statusKirim).length,
          ratingMasuk: items.filter((i) => i.sudahRating).length,
          rataKlinik: rata === null || rata === undefined ? null : Number(rata),
        },
      },
    };
  } catch (err) {
    return handleServiceError(err, "Terjadi kesalahan saat mengambil daftar tagihan.");
  }
};

// ============================================================
// Buat invoice
// ============================================================

/**
 * Buat invoice untuk kunjungan yang sudah selesai (diagnosa terisi).
 * Tarif & diskon disalin ke invoice_detail; nomor INV-YYYYMMDD-NNN berurutan per hari.
 */
export const createInvoiceService = async (
  idKunjungan: number,
  idUser: string,
): Promise<ActionResponse<{ idInvoice: number; nomorInvoice: string }>> => {
  try {
    const hasil = await mysqlTransaction(async (conn) => {
      const [kj] = await conn.execute<RowDataPacket[]>(
        "SELECT status FROM kunjungan WHERE idKunjungan = ? FOR UPDATE",
        [idKunjungan],
      );
      if (!kj[0]) throw new InvoiceError("Kunjungan tidak ditemukan.");
      if (kj[0].status !== "selesai") {
        throw new InvoiceError("Invoice hanya bisa dibuat setelah dokter mengisi diagnosa.");
      }
      const [ada] = await conn.execute<RowDataPacket[]>(
        "SELECT idInvoice, nomorInvoice FROM invoice WHERE idKunjungan = ?",
        [idKunjungan],
      );
      if (ada[0]) return { idInvoice: ada[0].idInvoice, nomorInvoice: ada[0].nomorInvoice };

      const [rows] = await conn.execute<RowDataPacket[]>(
        `SELECT l.namaLayanan, l.tarif, ${DISKON_SQL} AS diskonPersen
           FROM kunjungan_layanan kl
           JOIN kunjungan kj ON kj.idKunjungan = kl.idKunjungan
           JOIN layanan l ON l.idLayanan = kl.idLayanan
          WHERE kl.idKunjungan = ?
          ORDER BY kl.idKunjunganLayanan`,
        [idKunjungan],
      );
      if (rows.length === 0) throw new InvoiceError("Kunjungan belum memiliki layanan/tindakan.");
      const items = hitungItem(rows);
      const subtotal = rupiah(items.reduce((s, i) => s + i.tarif, 0));
      const totalDiskon = rupiah(items.reduce((s, i) => s + i.potongan, 0));

      const [hari] = await conn.query<RowDataPacket[]>(
        "SELECT DATE_FORMAT(CURDATE(), '%Y%m%d') AS kode, CURDATE() AS tgl",
      );
      const [urut] = await conn.execute<RowDataPacket[]>(
        `SELECT COALESCE(MAX(CAST(SUBSTRING_INDEX(nomorInvoice, '-', -1) AS UNSIGNED)), 0) AS terakhir
           FROM invoice WHERE tanggal = CURDATE() FOR UPDATE`,
      );
      const nomorInvoice = `INV-${hari[0].kode}-${String(Number(urut[0].terakhir) + 1).padStart(3, "0")}`;

      const [res] = await conn.execute<ResultSetHeader>(
        `INSERT INTO invoice
           (nomorInvoice, idKunjungan, tanggal, subtotal, totalDiskon, totalBayar, tokenPublik, dibuatOleh)
         VALUES (?, ?, CURDATE(), ?, ?, ?, ?, ?)`,
        [
          nomorInvoice,
          idKunjungan,
          subtotal,
          totalDiskon,
          rupiah(subtotal - totalDiskon),
          randomBytes(16).toString("hex"),
          idUser,
        ],
      );
      await conn.query(
        `INSERT INTO invoice_detail (idInvoice, namaLayanan, tarif, diskonPersen, potongan, subtotal)
         VALUES ?`,
        [
          items.map((i) => [
            res.insertId,
            i.namaLayanan,
            i.tarif,
            i.diskonPersen,
            i.potongan,
            i.subtotal,
          ]),
        ],
      );
      return { idInvoice: res.insertId, nomorInvoice };
    });
    return { success: true, data: hasil, message: `Invoice ${hasil.nomorInvoice} dibuat.` };
  } catch (err) {
    if (err instanceof InvoiceError) return { success: false, error: err.message };
    return handleServiceError(err, "Terjadi kesalahan saat membuat invoice.");
  }
};

// ============================================================
// Detail invoice (admin & publik)
// ============================================================

async function ambilInvoice(kolom: "idInvoice" | "tokenPublik", nilai: number | string) {
  const pool = getMySQLPool();
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT i.idInvoice, i.nomorInvoice, DATE_FORMAT(i.tanggal, '%Y-%m-%d') AS tanggal,
            i.subtotal, i.totalDiskon, i.totalBayar, i.tokenPublik, i.statusKirim,
            DATE_FORMAT(i.waktuKirim, '%Y-%m-%d %H:%i') AS waktuKirim,
            kj.idKunjungan, kj.kodeKunjungan, DATE_FORMAT(kj.tglKunjungan, '%Y-%m-%d') AS tglKunjungan,
            p.namaLengkap AS namaPasien, p.NoRM, p.noHp, p.jenisPenjamin,
            po.namaPoli, d.namaLengkap AS namaDokter, pr.namaLengkap AS namaPerawat,
            rk.nilaiDokter, rk.nilaiPerawat, rk.nilaiKlinik, rk.ulasan,
            DATE_FORMAT(rk.created_at, '%Y-%m-%d %H:%i') AS ratingPada
       FROM invoice i
       JOIN kunjungan kj ON kj.idKunjungan = i.idKunjungan
       JOIN pasien p ON p.idPasien = kj.idPasien
       JOIN poli po ON po.idPoli = kj.idPoli
       LEFT JOIN karyawan d ON d.idKaryawan = kj.idDokter
       LEFT JOIN rekam_medis rm ON rm.idKunjungan = kj.idKunjungan
       LEFT JOIN karyawan pr ON pr.idKaryawan = COALESCE(rm.idPerawat, kj.idPerawat)
       LEFT JOIN rating_kunjungan rk ON rk.idKunjungan = kj.idKunjungan
      WHERE i.${kolom} = ? LIMIT 1`,
    [nilai],
  );
  const r = rows[0];
  if (!r) return null;
  const [detail] = await pool.execute<RowDataPacket[]>(
    `SELECT namaLayanan, tarif, diskonPersen, potongan, subtotal
       FROM invoice_detail WHERE idInvoice = ? ORDER BY idInvoiceDetail`,
    [r.idInvoice],
  );
  const rating: RatingKunjungan | null =
    r.nilaiDokter === null || r.nilaiDokter === undefined
      ? null
      : {
          nilaiDokter: Number(r.nilaiDokter),
          nilaiPerawat: r.nilaiPerawat === null ? null : Number(r.nilaiPerawat),
          nilaiKlinik: Number(r.nilaiKlinik),
          ulasan: r.ulasan ?? null,
          createdAt: r.ratingPada,
        };
  const data: InvoiceData = {
    idInvoice: r.idInvoice,
    nomorInvoice: r.nomorInvoice,
    tanggal: r.tanggal,
    kodeKunjungan: r.kodeKunjungan,
    tglKunjungan: r.tglKunjungan,
    namaPasien: r.namaPasien,
    NoRM: r.NoRM,
    noHp: r.noHp ?? null,
    jenisPenjamin: r.jenisPenjamin,
    namaPoli: r.namaPoli,
    namaDokter: r.namaDokter ?? null,
    namaPerawat: r.namaPerawat ?? null,
    items: detail.map((d) => ({
      namaLayanan: d.namaLayanan,
      tarif: Number(d.tarif),
      diskonPersen: Number(d.diskonPersen),
      potongan: Number(d.potongan),
      subtotal: Number(d.subtotal),
    })),
    subtotal: Number(r.subtotal),
    totalDiskon: Number(r.totalDiskon),
    totalBayar: Number(r.totalBayar),
    token: r.tokenPublik,
    statusKirim: Boolean(r.statusKirim),
    waktuKirim: r.waktuKirim ?? null,
    rating,
  };
  return data;
}

export const getInvoiceByIdService = async (
  idInvoice: number,
): Promise<ActionResponse<InvoiceData>> => {
  try {
    const data = await ambilInvoice("idInvoice", idInvoice);
    if (!data) return { success: false, error: "Invoice tidak ditemukan." };
    return { success: true, data };
  } catch (err) {
    return handleServiceError(err, "Terjadi kesalahan saat mengambil invoice.");
  }
};

/** Untuk halaman pasien: tanpa nomor HP */
export const getInvoiceByTokenService = async (
  token: string,
): Promise<ActionResponse<InvoiceData>> => {
  try {
    const data = await ambilInvoice("tokenPublik", token);
    if (!data) return { success: false, error: "Tautan tidak valid atau sudah tidak berlaku." };
    return { success: true, data: { ...data, noHp: null } };
  } catch (err) {
    return handleServiceError(err, "Terjadi kesalahan saat mengambil invoice.");
  }
};

export const tandaiTerkirimService = async (idInvoice: number): Promise<ActionResponse> => {
  try {
    const [res] = await getMySQLPool().execute<ResultSetHeader>(
      "UPDATE invoice SET statusKirim = TRUE, waktuKirim = NOW() WHERE idInvoice = ?",
      [idInvoice],
    );
    if (res.affectedRows === 0) return { success: false, error: "Invoice tidak ditemukan." };
    return { success: true, message: "Invoice ditandai terkirim." };
  } catch (err) {
    return handleServiceError(err, "Terjadi kesalahan saat memperbarui status kirim.");
  }
};

// ============================================================
// Rating dari pasien (publik, lewat token)
// ============================================================

export const simpanRatingService = async (
  token: string,
  d: RatingInput,
): Promise<ActionResponse> => {
  try {
    await mysqlTransaction(async (conn) => {
      const [rows] = await conn.execute<RowDataPacket[]>(
        `SELECT kj.idKunjungan, kj.idDokter, rm.idPerawat
           FROM invoice i
           JOIN kunjungan kj ON kj.idKunjungan = i.idKunjungan
           LEFT JOIN rekam_medis rm ON rm.idKunjungan = kj.idKunjungan
          WHERE i.tokenPublik = ? FOR UPDATE`,
        [token],
      );
      const r = rows[0];
      if (!r) throw new InvoiceError("Tautan rating tidak valid.");
      if (!r.idDokter)
        throw new InvoiceError("Kunjungan ini tidak memiliki dokter penanggung jawab.");
      const [ada] = await conn.execute<RowDataPacket[]>(
        "SELECT 1 FROM rating_kunjungan WHERE idKunjungan = ?",
        [r.idKunjungan],
      );
      if (ada[0])
        throw new InvoiceError("Terima kasih, penilaian untuk kunjungan ini sudah dikirim.");

      const idPerawat: number | null = r.idPerawat ?? null;
      if (idPerawat && d.nilaiPerawat === null) {
        throw new InvoiceError("Beri bintang untuk perawat terlebih dahulu.");
      }
      await conn.execute(
        `INSERT INTO rating_kunjungan
           (idKunjungan, idDokter, idPerawat, nilaiDokter, nilaiPerawat, nilaiKlinik, ulasan)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          r.idKunjungan,
          r.idDokter,
          idPerawat,
          d.nilaiDokter,
          idPerawat ? d.nilaiPerawat : null,
          d.nilaiKlinik,
          d.ulasan,
        ],
      );
    });
    return { success: true, message: "Terima kasih atas penilaian Anda!" };
  } catch (err) {
    if (err instanceof InvoiceError) return { success: false, error: err.message };
    if ((err as { code?: string })?.code === "ER_DUP_ENTRY") {
      return {
        success: false,
        error: "Terima kasih, penilaian untuk kunjungan ini sudah dikirim.",
      };
    }
    return handleServiceError(err, "Terjadi kesalahan saat menyimpan penilaian.");
  }
};
