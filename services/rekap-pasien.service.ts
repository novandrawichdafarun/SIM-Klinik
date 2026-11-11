import { randomBytes } from "crypto";
import { PoolConnection, ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { getMySQLPool } from "@/database/mysql-client";
import type {
  DiagnosaInput,
  KunjunganInput,
  PasienInput,
  PemeriksaanInput,
} from "@/schemas/rekap-pasien.schema";
import { ActionResponse } from "@/types/action";
import type {
  AntreanDiagnosa,
  KunjunganItem,
  PoliOption,
  Pasien,
  PasienRingkas,
  PetugasOption,
  RiwayatPenanganan,
  StatusKunjungan,
  TindakanOption,
} from "@/types/rekap-pasien";
import { handleServiceError } from "@/utils/error";
import { generateNoRM, kategoriJabatanJasa } from "@/utils/format";
import { isMySQLDuplicateError, mysqlTransaction } from "@/utils/mysql";
import { sinkronPemasukanKlinik } from "./pemasukan-klinik.service";

/** Error yang pesannya aman ditampilkan ke pengguna */
class RekapError extends Error {}

const tgl = (v: unknown) => (v ? String(v).slice(0, 10) : null);
const jam = (v: unknown) => String(v ?? "").slice(0, 5);

// ============================================================
// Pasien
// ============================================================

function toPasien(r: RowDataPacket): Pasien {
  return {
    idPasien: r.idPasien,
    NoRM: r.NoRM,
    namaLengkap: r.namaLengkap,
    NIK: r.NIK,
    jenisKelamin: r.jenisKelamin,
    tempatLahir: r.tempatLahir ?? null,
    tanggalLahir: tgl(r.tanggalLahir),
    golonganDarah: r.golonganDarah ?? null,
    statusPernikahan: r.statusPernikahan ?? null,
    agama: r.agama ?? null,
    pekerjaan: r.pekerjaan ?? null,
    noHp: r.noHp ?? null,
    email: r.email ?? null,
    alamat: r.alamat ?? null,
    alamatDomisili: r.alamatDomisili ?? null,
    kecamatan: r.kecamatan ?? null,
    kotaKabupaten: r.kotaKabupaten ?? null,
    provinsi: r.provinsi ?? null,
    jenisPenjamin: r.jenisPenjamin,
    noBpjs: r.noBpjs ?? null,
    fktpAsal: r.fktpAsal ?? null,
    createdAt: tgl(r.created_at) ?? "",
  };
}

function duplikatPasien(err: unknown): string | null {
  if (!isMySQLDuplicateError(err)) return null;
  const msg = (err as Error).message ?? "";
  if (msg.includes("uk_pasien_nik")) return "NIK sudah terdaftar pada pasien lain.";
  if (msg.includes("uk_pasien_no_bpjs"))
    return "Nomor kartu BPJS sudah terdaftar pada pasien lain.";
  return "Data pasien sudah ada.";
}

const KOLOM_PASIEN = [
  "namaLengkap",
  "NIK",
  "jenisKelamin",
  "tempatLahir",
  "tanggalLahir",
  "golonganDarah",
  "statusPernikahan",
  "agama",
  "pekerjaan",
  "noHp",
  "email",
  "alamat",
  "alamatDomisili",
  "kecamatan",
  "kotaKabupaten",
  "provinsi",
  "jenisPenjamin",
  "noBpjs",
  "fktpAsal",
] as const;

const nilaiPasien = (d: PasienInput) =>
  KOLOM_PASIEN.map((k) =>
    // No. BPJS hanya disimpan untuk penjamin BPJS
    k === "noBpjs" && d.jenisPenjamin !== "BPJS Kesehatan (JKN)" ? null : d[k],
  );

export const getPasienByIdService = async (idPasien: number): Promise<ActionResponse<Pasien>> => {
  try {
    const [rows] = await getMySQLPool().execute<RowDataPacket[]>(
      "SELECT * FROM pasien WHERE idPasien = ? LIMIT 1",
      [idPasien],
    );
    if (!rows[0]) return { success: false, error: "Pasien tidak ditemukan." };
    return { success: true, data: toPasien(rows[0]) };
  } catch (err) {
    return handleServiceError(err, "Terjadi kesalahan saat mengambil data pasien.");
  }
};

/** Tambah pasien. No. RM dibuat otomatis (INSERT dengan TMP-…, lalu UPDATE ke RM-xxxxxx). */
export const createPasienService = async (
  d: PasienInput,
): Promise<ActionResponse<{ idPasien: number }>> => {
  try {
    const idPasien = await mysqlTransaction(async (conn) => {
      const [res] = await conn.execute<ResultSetHeader>(
        `INSERT INTO pasien (NoRM, ${KOLOM_PASIEN.join(", ")})
         VALUES (?, ${KOLOM_PASIEN.map(() => "?").join(", ")})`,
        [`TMP-${randomBytes(8).toString("hex")}`, ...nilaiPasien(d)],
      );
      await conn.execute("UPDATE pasien SET NoRM = ? WHERE idPasien = ?", [
        generateNoRM(res.insertId),
        res.insertId,
      ]);
      return res.insertId;
    });
    return { success: true, data: { idPasien }, message: "Pasien berhasil ditambahkan." };
  } catch (err) {
    const dup = duplikatPasien(err);
    if (dup) return { success: false, error: dup };
    return handleServiceError(err, "Terjadi kesalahan saat menyimpan pasien.");
  }
};

/** Ubah pasien. No. RM tidak pernah ikut diubah (juga dikunci trigger DB). */
export const updatePasienService = async (
  idPasien: number,
  d: PasienInput,
): Promise<ActionResponse> => {
  try {
    const [res] = await getMySQLPool().execute<ResultSetHeader>(
      `UPDATE pasien SET ${KOLOM_PASIEN.map((k) => `${k} = ?`).join(", ")} WHERE idPasien = ?`,
      [...nilaiPasien(d), idPasien],
    );
    if (res.affectedRows === 0) return { success: false, error: "Pasien tidak ditemukan." };
    return { success: true, message: "Data pasien berhasil diperbarui." };
  } catch (err) {
    const dup = duplikatPasien(err);
    if (dup) return { success: false, error: dup };
    return handleServiceError(err, "Terjadi kesalahan saat memperbarui pasien.");
  }
};

export const deletePasienService = async (idPasien: number): Promise<ActionResponse> => {
  try {
    const [kj] = await getMySQLPool().execute<RowDataPacket[]>(
      "SELECT COUNT(*) AS jumlah FROM kunjungan WHERE idPasien = ?",
      [idPasien],
    );
    if (Number(kj[0].jumlah) > 0) {
      return {
        success: false,
        error: "Pasien sudah memiliki riwayat kunjungan sehingga tidak dapat dihapus.",
      };
    }
    const [res] = await getMySQLPool().execute<ResultSetHeader>(
      "DELETE FROM pasien WHERE idPasien = ?",
      [idPasien],
    );
    if (res.affectedRows === 0) return { success: false, error: "Pasien tidak ditemukan." };
    return { success: true, message: "Pasien berhasil dihapus." };
  } catch (err) {
    return handleServiceError(err, "Terjadi kesalahan saat menghapus pasien.");
  }
};

/**
 * Daftar pasien. `idKaryawan` diisi → hanya pasien yang pernah ditangani karyawan itu
 * (sebagai dokter atau perawat). Diagnosa terakhir hanya diisi bila `denganDiagnosa`.
 */
export const getPasienListService = async (opts: {
  q: string;
  idKaryawan: number | null;
  denganDiagnosa: boolean;
}): Promise<ActionResponse<PasienRingkas[]>> => {
  try {
    const where: string[] = [];
    const values: unknown[] = [];
    if (opts.idKaryawan !== null) {
      where.push(`EXISTS (SELECT 1 FROM kunjungan k2 JOIN rekam_medis r2 ON r2.idKunjungan = k2.idKunjungan
                           WHERE k2.idPasien = p.idPasien AND (r2.idDokter = ? OR r2.idPerawat = ?))`);
      values.push(opts.idKaryawan, opts.idKaryawan);
    }
    const q = opts.q.trim();
    if (q) {
      where.push("(p.namaLengkap LIKE ? OR p.NIK LIKE ? OR p.noBpjs LIKE ? OR p.NoRM LIKE ?)");
      values.push(...Array(4).fill(`%${q}%`));
    }

    const [rows] = await getMySQLPool().query<RowDataPacket[]>(
      `SELECT p.idPasien, p.NoRM, p.namaLengkap, p.NIK, p.noBpjs,
              terakhir.tglKunjungan AS pemeriksaanTerakhir, terakhir.diagnosa
         FROM pasien p
         LEFT JOIN LATERAL (
           SELECT kj.tglKunjungan, rm.diagnosa
             FROM kunjungan kj
             JOIN rekam_medis rm ON rm.idKunjungan = kj.idKunjungan
            WHERE kj.idPasien = p.idPasien
            ORDER BY kj.tglKunjungan DESC, kj.jamKunjungan DESC
            LIMIT 1
         ) terakhir ON TRUE
        ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
        ORDER BY terakhir.tglKunjungan IS NULL, terakhir.tglKunjungan DESC, p.namaLengkap ASC
        LIMIT 200`,
      values,
    );
    return {
      success: true,
      data: rows.map((r) => ({
        idPasien: r.idPasien,
        NoRM: r.NoRM,
        namaLengkap: r.namaLengkap,
        NIK: r.NIK,
        noBpjs: r.noBpjs ?? null,
        pemeriksaanTerakhir: tgl(r.pemeriksaanTerakhir),
        diagnosaTerakhir: opts.denganDiagnosa ? (r.diagnosa ?? null) : null,
      })),
    };
  } catch (err) {
    return handleServiceError(err, "Terjadi kesalahan saat mengambil daftar pasien.");
  }
};

/** Pilihan pasien untuk form daftar kunjungan */
export const getPasienOptionsService = async (): Promise<
  ActionResponse<{ idPasien: number; NoRM: string; namaLengkap: string; NIK: string }[]>
> => {
  try {
    const [rows] = await getMySQLPool().query<RowDataPacket[]>(
      "SELECT idPasien, NoRM, namaLengkap, NIK FROM pasien ORDER BY namaLengkap ASC",
    );
    return {
      success: true,
      data: rows.map((r) => ({
        idPasien: r.idPasien,
        NoRM: r.NoRM,
        namaLengkap: r.namaLengkap,
        NIK: r.NIK,
      })),
    };
  } catch (err) {
    return handleServiceError(err, "Terjadi kesalahan saat mengambil daftar pasien.");
  }
};

// ============================================================
// Kunjungan
// ============================================================

/** Nama semua tindakan kunjungan (diisi dokter saat diagnosa); NULL = belum ada tindakan */
const LAYANAN_KUNJUNGAN_SQL = `(SELECT GROUP_CONCAT(l2.namaLayanan ORDER BY kl2.idKunjunganLayanan SEPARATOR ', ')
       FROM kunjungan_layanan kl2 JOIN layanan l2 ON l2.idLayanan = kl2.idLayanan
      WHERE kl2.idKunjungan = kj.idKunjungan)`;

const SELECT_KUNJUNGAN = `
  SELECT kj.idKunjungan, kj.kodeKunjungan, kj.tglKunjungan, kj.jamKunjungan, kj.status,
         kj.idDokter, p.idPasien, p.namaLengkap AS namaPasien, p.NoRM, p.NIK, p.noBpjs,
         ${LAYANAN_KUNJUNGAN_SQL} AS namaLayanan, kj.idPoli, po.namaPoli,
         d.namaLengkap AS namaDokter, kj.idPerawat, pr.namaLengkap AS namaPerawat
    FROM kunjungan kj
    JOIN pasien p ON p.idPasien = kj.idPasien
    JOIN poli po ON po.idPoli = kj.idPoli
    LEFT JOIN karyawan d ON d.idKaryawan = kj.idDokter
    LEFT JOIN karyawan pr ON pr.idKaryawan = kj.idPerawat`;

function toKunjungan(r: RowDataPacket, bisaPeriksa: (r: RowDataPacket) => boolean): KunjunganItem {
  return {
    idKunjungan: r.idKunjungan,
    kodeKunjungan: r.kodeKunjungan,
    tanggal: tgl(r.tglKunjungan) ?? "",
    jam: jam(r.jamKunjungan),
    status: r.status as StatusKunjungan,
    idPasien: r.idPasien,
    namaPasien: r.namaPasien,
    NoRM: r.NoRM,
    NIK: r.NIK,
    noBpjs: r.noBpjs ?? null,
    namaLayanan: r.namaLayanan ?? "",
    idPoli: r.idPoli,
    namaPoli: r.namaPoli,
    idDokter: r.idDokter ?? null,
    namaDokter: r.namaDokter ?? null,
    idPerawat: r.idPerawat ?? null,
    namaPerawat: r.namaPerawat ?? null,
    bisaPeriksa: bisaPeriksa(r),
  };
}

/**
 * Kunjungan pada satu tanggal. `hanyaDokter` diisi → hanya kunjungan dokter tersebut.
 * Tombol Periksa: perawat (yang berhak) untuk semua kunjungan menunggu,
 * dokter untuk kunjungan menunggu yang ia tangani.
 */
export const getKunjunganByTanggalService = async (opts: {
  tanggal: string;
  q: string;
  hanyaDokter: number | null;
  pemeriksa: { peran: "dokter" | "perawat"; idKaryawan: number } | null;
}): Promise<ActionResponse<KunjunganItem[]>> => {
  try {
    const where = ["kj.tglKunjungan = ?", "kj.status <> 'batal'"];
    const values: unknown[] = [opts.tanggal];
    if (opts.hanyaDokter !== null) {
      where.push("kj.idDokter = ?");
      values.push(opts.hanyaDokter);
    }
    const q = opts.q.trim();
    if (q) {
      where.push("(p.namaLengkap LIKE ? OR p.NIK LIKE ? OR p.noBpjs LIKE ? OR p.NoRM LIKE ?)");
      values.push(...Array(4).fill(`%${q}%`));
    }
    const [rows] = await getMySQLPool().query<RowDataPacket[]>(
      `${SELECT_KUNJUNGAN} WHERE ${where.join(" AND ")} ORDER BY kj.jamKunjungan ASC, kj.idKunjungan ASC`,
      values,
    );
    const p = opts.pemeriksa;
    return {
      success: true,
      data: rows.map((r) =>
        toKunjungan(
          r,
          (row) =>
            p !== null &&
            row.status === "menunggu" &&
            (p.peran === "perawat"
              ? row.idPerawat === p.idKaryawan
              : row.idDokter === p.idKaryawan),
        ),
      ),
    };
  } catch (err) {
    return handleServiceError(err, "Terjadi kesalahan saat mengambil kunjungan.");
  }
};

/** Kunjungan milik dokter yang masih menunggu diagnosa (semua tanggal, terlama dahulu) */
export const getAntreanDiagnosaService = async (
  idDokter: number,
  q: string,
): Promise<ActionResponse<AntreanDiagnosa[]>> => {
  try {
    const where = ["kj.idDokter = ?", "kj.status = 'menunggu'"];
    const values: unknown[] = [idDokter];
    const cari = q.trim();
    if (cari) {
      where.push("(p.namaLengkap LIKE ? OR p.NIK LIKE ? OR p.noBpjs LIKE ? OR p.NoRM LIKE ?)");
      values.push(...Array(4).fill(`%${cari}%`));
    }
    const [rows] = await getMySQLPool().query<RowDataPacket[]>(
      `SELECT x.*, EXISTS (SELECT 1 FROM rekam_medis rm WHERE rm.idKunjungan = x.idKunjungan) AS sudahDiperiksa
         FROM (${SELECT_KUNJUNGAN} WHERE ${where.join(" AND ")}) x
        ORDER BY x.tglKunjungan ASC, x.jamKunjungan ASC, x.idKunjungan ASC
        LIMIT 100`,
      values,
    );
    return {
      success: true,
      data: rows.map((r) => ({
        ...toKunjungan(r, () => true),
        sudahDiperiksa: Boolean(Number(r.sudahDiperiksa)),
      })),
    };
  } catch (err) {
    return handleServiceError(err, "Terjadi kesalahan saat mengambil antrean diagnosa.");
  }
};

export const getKunjunganByIdService = async (
  idKunjungan: number,
): Promise<ActionResponse<KunjunganItem>> => {
  try {
    const [rows] = await getMySQLPool().execute<RowDataPacket[]>(
      `${SELECT_KUNJUNGAN} WHERE kj.idKunjungan = ? LIMIT 1`,
      [idKunjungan],
    );
    if (!rows[0]) return { success: false, error: "Kunjungan tidak ditemukan." };
    return { success: true, data: toKunjungan(rows[0], () => false) };
  } catch (err) {
    return handleServiceError(err, "Terjadi kesalahan saat mengambil kunjungan.");
  }
};

/** Riwayat penanganan satu pasien (diagnosa hanya bila `denganDiagnosa`) */
export const getRiwayatPasienService = async (
  idPasien: number,
  denganDiagnosa: boolean,
): Promise<ActionResponse<RiwayatPenanganan[]>> => {
  try {
    const [rows] = await getMySQLPool().execute<RowDataPacket[]>(
      `SELECT kj.idKunjungan, kj.kodeKunjungan, kj.tglKunjungan, kj.jamKunjungan, kj.status,
              po.namaPoli, ${LAYANAN_KUNJUNGAN_SQL} AS namaLayanan,
              d.namaLengkap AS namaDokter, pr.namaLengkap AS namaPerawat, rm.diagnosa
         FROM kunjungan kj
         JOIN poli po ON po.idPoli = kj.idPoli
         LEFT JOIN rekam_medis rm ON rm.idKunjungan = kj.idKunjungan
         LEFT JOIN karyawan d ON d.idKaryawan = COALESCE(rm.idDokter, kj.idDokter)
         LEFT JOIN karyawan pr ON pr.idKaryawan = COALESCE(rm.idPerawat, kj.idPerawat)
        WHERE kj.idPasien = ?
        ORDER BY kj.tglKunjungan DESC, kj.jamKunjungan DESC`,
      [idPasien],
    );
    return {
      success: true,
      data: rows.map((r) => ({
        idKunjungan: r.idKunjungan,
        kodeKunjungan: r.kodeKunjungan,
        tanggal: tgl(r.tglKunjungan) ?? "",
        jam: jam(r.jamKunjungan),
        namaPoli: r.namaPoli,
        namaLayanan: r.namaLayanan ?? "Layanan belum diisi dokter",
        namaDokter: r.namaDokter ?? null,
        namaPerawat: r.namaPerawat ?? null,
        status: r.status as StatusKunjungan,
        diagnosa: denganDiagnosa ? (r.diagnosa ?? null) : null,
      })),
    };
  } catch (err) {
    return handleServiceError(err, "Terjadi kesalahan saat mengambil riwayat pasien.");
  }
};

/** Pilihan layanan aktif + dokter & perawat aktif (difilter per poli di form) */
export const getOpsiKunjunganService = async (): Promise<
  ActionResponse<{ poli: PoliOption[]; dokter: PetugasOption[]; perawat: PetugasOption[] }>
> => {
  try {
    const pool = getMySQLPool();
    const [[poli], [karyawan]] = await Promise.all([
      pool.query<RowDataPacket[]>("SELECT idPoli, namaPoli FROM poli ORDER BY idPoli ASC"),
      pool.query<RowDataPacket[]>(
        `SELECT idKaryawan, namaLengkap, jenisKaryawan, idPoli
           FROM karyawan WHERE statusAktif = TRUE ORDER BY namaLengkap ASC`,
      ),
    ]);
    const petugas = (jenis: "dokter" | "perawat") =>
      karyawan
        .filter((k) => kategoriJabatanJasa(k.jenisKaryawan) === jenis)
        .map((k) => ({ idKaryawan: k.idKaryawan, namaLengkap: k.namaLengkap, idPoli: k.idPoli }));
    return {
      success: true,
      data: {
        poli: poli.map((p) => ({ idPoli: p.idPoli, namaPoli: p.namaPoli })),
        dokter: petugas("dokter"),
        perawat: petugas("perawat"),
      },
    };
  } catch (err) {
    return handleServiceError(err, "Terjadi kesalahan saat mengambil pilihan kunjungan.");
  }
};

/**
 * Daftarkan kunjungan. Kode KJ-YYYYMMDD-NNN dibuat otomatis berurutan per tanggal.
 * Layanan pendaftaran langsung menjadi tindakan pertama (bisa diubah perawat saat pemeriksaan).
 */
export const createKunjunganService = async (
  d: KunjunganInput,
): Promise<ActionResponse<{ idKunjungan: number; kodeKunjungan: string }>> => {
  try {
    const result = await mysqlTransaction(async (conn) => {
      const [cek] = await conn.execute<RowDataPacket[]>(
        `SELECT (SELECT COUNT(*) FROM poli WHERE idPoli = ?) AS adaPoli,
                (SELECT jenisKaryawan FROM karyawan WHERE idKaryawan = ? AND statusAktif = TRUE) AS jabatanDokter,
                (SELECT jenisKaryawan FROM karyawan WHERE idKaryawan = ? AND statusAktif = TRUE) AS jabatanPerawat,
                (SELECT COUNT(*) FROM pasien WHERE idPasien = ?) AS adaPasien`,
        [d.idPoli, d.idDokter, d.idPerawat, d.idPasien],
      );
      const c = cek[0];
      if (Number(c.adaPoli) === 0) throw new RekapError("Poli tujuan tidak ditemukan.");
      if (Number(c.adaPasien) === 0) throw new RekapError("Pasien tidak ditemukan.");
      if (kategoriJabatanJasa(c.jabatanDokter) !== "dokter") {
        throw new RekapError("Dokter yang dituju tidak valid atau nonaktif.");
      }
      if (kategoriJabatanJasa(c.jabatanPerawat) !== "perawat") {
        throw new RekapError("Perawat yang membantu tidak valid atau nonaktif.");
      }

      // Nomor urut per tanggal; baris dikunci supaya dua pendaftaran bersamaan tidak bentrok
      const [urut] = await conn.execute<RowDataPacket[]>(
        `SELECT COALESCE(MAX(CAST(SUBSTRING_INDEX(kodeKunjungan, '-', -1) AS UNSIGNED)), 0) AS terakhir
           FROM kunjungan WHERE tglKunjungan = ? FOR UPDATE`,
        [d.tglKunjungan],
      );
      const kode = `KJ-${d.tglKunjungan.replaceAll("-", "")}-${String(Number(urut[0].terakhir) + 1).padStart(3, "0")}`;

      const [res] = await conn.execute<ResultSetHeader>(
        `INSERT INTO kunjungan
           (kodeKunjungan, idPoli, tglKunjungan, jamKunjungan, idPasien, idDokter, idPerawat, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'menunggu')`,
        [
          kode,
          d.idPoli,
          d.tglKunjungan,
          `${d.jamKunjungan}:00`,
          d.idPasien,
          d.idDokter,
          d.idPerawat,
        ],
      );
      return { idKunjungan: res.insertId, kodeKunjungan: kode };
    });
    return { success: true, data: result, message: `Kunjungan ${result.kodeKunjungan} terdaftar.` };
  } catch (err) {
    if (err instanceof RekapError) return { success: false, error: err.message };
    return handleServiceError(err, "Terjadi kesalahan saat mendaftarkan kunjungan.");
  }
};

// ============================================================
// Pemeriksaan (perawat) & diagnosa (dokter penanggung jawab)
// ============================================================

/** Layanan aktif di poli tertentu, untuk pencarian "Tambah layanan" */
export const getTindakanOptionsService = async (
  idPoli: number,
): Promise<ActionResponse<TindakanOption[]>> => {
  try {
    const [rows] = await getMySQLPool().execute<RowDataPacket[]>(
      `SELECT idLayanan, kodeLayanan, namaLayanan, kategori
         FROM layanan WHERE idPoli = ? AND statusAktif = TRUE
        ORDER BY namaLayanan ASC`,
      [idPoli],
    );
    return {
      success: true,
      data: rows.map((r) => ({
        idLayanan: r.idLayanan,
        kodeLayanan: r.kodeLayanan,
        namaLayanan: r.namaLayanan,
        kategori: r.kategori,
      })),
    };
  } catch (err) {
    return handleServiceError(err, "Terjadi kesalahan saat mengambil daftar layanan.");
  }
};

export interface PemeriksaanTersimpan {
  ada: boolean;
  idPerawat: number | null;
  namaPerawat: string | null;
  nilai: Record<string, string | number | null>;
  layanan: number[];
  terkunci: boolean;
}

export const getPemeriksaanService = async (
  idKunjungan: number,
): Promise<ActionResponse<PemeriksaanTersimpan>> => {
  try {
    const pool = getMySQLPool();
    const [[rm], [items], [klaim]] = await Promise.all([
      pool.execute<RowDataPacket[]>(
        `SELECT rm.idPerawat, pr.namaLengkap AS namaPerawat, rm.tekananDarah, rm.suhu, rm.nadi,
                rm.lajuNapas, rm.beratBadan, rm.tinggiBadan, rm.keluhan, rm.diagnosa, rm.catatanDokter
           FROM rekam_medis rm LEFT JOIN karyawan pr ON pr.idKaryawan = rm.idPerawat
          WHERE rm.idKunjungan = ? LIMIT 1`,
        [idKunjungan],
      ),
      pool.execute<RowDataPacket[]>(
        "SELECT idLayanan FROM kunjungan_layanan WHERE idKunjungan = ? ORDER BY idKunjunganLayanan",
        [idKunjungan],
      ),
      pool.execute<RowDataPacket[]>(
        `SELECT COUNT(*) AS jumlah
           FROM kunjungan_layanan kl
           JOIN klaim_jasa_detail kd ON kd.idKunjunganLayanan = kl.idKunjunganLayanan
           JOIN klaim_jasa k ON k.idKlaim = kd.idKlaim AND k.status <> 'ditolak'
          WHERE kl.idKunjungan = ?`,
        [idKunjungan],
      ),
    ]);
    return {
      success: true,
      data: {
        ada: Boolean(rm[0]),
        idPerawat: rm[0]?.idPerawat ?? null,
        namaPerawat: rm[0]?.namaPerawat ?? null,
        nilai: rm[0] ? { ...rm[0] } : {},
        layanan: items.map((i) => i.idLayanan),
        terkunci: Number(klaim[0].jumlah) > 0,
      },
    };
  } catch (err) {
    return handleServiceError(err, "Terjadi kesalahan saat mengambil data pemeriksaan.");
  }
};

/** Kunci kunjungan, pastikan belum dibatalkan & belum ada jasa yang diklaim */
async function kunciKunjungan(conn: PoolConnection, idKunjungan: number) {
  const [kj] = await conn.execute<RowDataPacket[]>(
    "SELECT idDokter, idPerawat, status, idPoli FROM kunjungan WHERE idKunjungan = ? FOR UPDATE",
    [idKunjungan],
  );
  if (!kj[0]) throw new RekapError("Kunjungan tidak ditemukan.");
  if (kj[0].status === "batal") throw new RekapError("Kunjungan sudah dibatalkan.");
  if (!kj[0].idDokter) throw new RekapError("Kunjungan belum memiliki dokter penanggung jawab.");

  const [klaim] = await conn.execute<RowDataPacket[]>(
    `SELECT COUNT(*) AS jumlah
       FROM kunjungan_layanan kl
       JOIN klaim_jasa_detail kd ON kd.idKunjunganLayanan = kl.idKunjunganLayanan
       JOIN klaim_jasa k ON k.idKlaim = kd.idKlaim AND k.status <> 'ditolak'
      WHERE kl.idKunjungan = ?`,
    [idKunjungan],
  );
  if (Number(klaim[0].jumlah) > 0) {
    throw new RekapError("Jasa kunjungan ini sudah diklaim sehingga datanya tidak dapat diubah.");
  }
  return kj[0] as { idDokter: number; idPerawat: number | null; status: string; idPoli: number };
}

/**
 * Simpan tab Pemeriksaan: tanda vital & keluhan (perawat yang ditugaskan, atau dokter).
 * Perawat pemeriksa (penerima jasa perawat) mengikuti perawat yang dipilih saat pendaftaran.
 */
export const simpanPemeriksaanService = async (
  idKunjungan: number,
  d: PemeriksaanInput,
): Promise<ActionResponse> => {
  try {
    await mysqlTransaction(async (conn) => {
      const kj = await kunciKunjungan(conn, idKunjungan);
      const vital = [
        d.tekananDarah,
        d.suhu,
        d.nadi,
        d.lajuNapas,
        d.beratBadan,
        d.tinggiBadan,
        d.keluhan,
      ];
      await conn.execute(
        `INSERT INTO rekam_medis
           (idKunjungan, idDokter, idPerawat, tekananDarah, suhu, nadi, lajuNapas,
            beratBadan, tinggiBadan, keluhan)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           idPerawat = VALUES(idPerawat),
           tekananDarah = VALUES(tekananDarah), suhu = VALUES(suhu), nadi = VALUES(nadi),
           lajuNapas = VALUES(lajuNapas), beratBadan = VALUES(beratBadan),
           tinggiBadan = VALUES(tinggiBadan), keluhan = VALUES(keluhan)`,
        [idKunjungan, kj.idDokter, kj.idPerawat, ...vital],
      );
    });
    return { success: true, message: "Pemeriksaan berhasil disimpan." };
  } catch (err) {
    if (err instanceof RekapError) return { success: false, error: err.message };
    return handleServiceError(err, "Terjadi kesalahan saat menyimpan pemeriksaan.");
  }
};

/**
 * Simpan tab Diagnosa (dokter penanggung jawab): layanan/tindakan, diagnosa, dan catatan.
 * Pemeriksaan harus sudah diisi. Setelah diagnosa, kunjungan selesai, jasa dokter & perawat
 * mulai dihitung, dan pemasukan klinik dihitung ulang.
 */
export const simpanDiagnosaService = async (
  idKunjungan: number,
  idDokter: number,
  d: DiagnosaInput,
): Promise<ActionResponse> => {
  try {
    await mysqlTransaction(async (conn) => {
      const kj = await kunciKunjungan(conn, idKunjungan);
      if (kj.idDokter !== idDokter) {
        throw new RekapError("Hanya dokter penanggung jawab yang dapat mengisi diagnosa.");
      }
      const [rm] = await conn.execute<RowDataPacket[]>(
        "SELECT idRekamMedis FROM rekam_medis WHERE idKunjungan = ? FOR UPDATE",
        [idKunjungan],
      );
      if (!rm[0]) {
        throw new RekapError("Tab Pemeriksaan (tanda vital & keluhan) belum diisi.");
      }

      // Semua layanan harus aktif & dari poli kunjungan
      const [valid] = await conn.query<RowDataPacket[]>(
        "SELECT idLayanan FROM layanan WHERE idLayanan IN (?) AND idPoli = ? AND statusAktif = TRUE",
        [d.layanan, kj.idPoli],
      );
      if (valid.length !== d.layanan.length) {
        throw new RekapError("Sebagian layanan tidak valid untuk poli kunjungan ini.");
      }
      // Ganti daftar tindakan: hapus yang dibuang, tambah yang baru
      await conn.query(
        "DELETE FROM kunjungan_layanan WHERE idKunjungan = ? AND idLayanan NOT IN (?)",
        [idKunjungan, d.layanan],
      );
      await conn.query("INSERT IGNORE INTO kunjungan_layanan (idKunjungan, idLayanan) VALUES ?", [
        d.layanan.map((idLayanan) => [idKunjungan, idLayanan]),
      ]);
      await conn.execute(
        `UPDATE rekam_medis SET diagnosa = ?, catatanDokter = ?
          WHERE idRekamMedis = ?`,
        [d.diagnosa, d.catatanDokter, rm[0].idRekamMedis],
      );
      // kunjungan.idLayanan = tindakan pertama (dipakai Laporan Layanan)
      await conn.execute(
        "UPDATE kunjungan SET status = 'selesai', idLayanan = ? WHERE idKunjungan = ?",
        [d.layanan[0], idKunjungan],
      );
      await sinkronPemasukanKlinik(conn, rm[0].idRekamMedis);
    });
    return { success: true, message: "Diagnosa berhasil disimpan." };
  } catch (err) {
    if (err instanceof RekapError) return { success: false, error: err.message };
    return handleServiceError(err, "Terjadi kesalahan saat menyimpan diagnosa.");
  }
};
