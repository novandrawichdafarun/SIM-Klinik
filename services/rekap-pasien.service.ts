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
  BiayaPemeriksaan,
  ItemDiagnosa,
  ItemDiagnosaTersimpan,
  KunjunganItem,
  PoliOption,
  Pasien,
  PasienRingkas,
  PetugasOption,
  RiwayatPenanganan,
  RincianBiayaDiagnosa,
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
const RESEP_BIAYA_PREFIX = "SIMKLINIK-DIAGNOSA-BIAYA-V1:";

function bulatkanUang(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function hitungItemDiagnosa(items: ItemDiagnosa[]): ItemDiagnosaTersimpan[] {
  return items.map((item) => ({
    ...item,
    subtotal: bulatkanUang(item.jumlah * item.hargaSatuan),
  }));
}

function parseRincianBiaya(value: unknown): RincianBiayaDiagnosa | null {
  if (typeof value !== "string" || !value.startsWith(RESEP_BIAYA_PREFIX)) return null;
  try {
    const data: unknown = JSON.parse(value.slice(RESEP_BIAYA_PREFIX.length));
    if (typeof data !== "object" || data === null) return null;
    const r = data as Record<string, unknown>;
    const biaya = r.biayaPemeriksaan;
    if (typeof biaya !== "object" || biaya === null) return null;
    const b = biaya as Record<string, unknown>;
    const biayaValid =
      Number.isSafeInteger(b.idLayanan) &&
      typeof b.namaLayanan === "string" &&
      typeof b.tarif === "number" &&
      Number.isFinite(b.tarif) &&
      typeof b.diskonPersen === "number" &&
      Number.isFinite(b.diskonPersen) &&
      typeof b.biaya === "number" &&
      Number.isFinite(b.biaya);
    const daftarValid = (items: unknown): items is ItemDiagnosaTersimpan[] =>
      Array.isArray(items) &&
      items.every(
        (item) =>
          typeof item === "object" &&
          item !== null &&
          "nama" in item &&
          typeof item.nama === "string" &&
          "jumlah" in item &&
          typeof item.jumlah === "number" &&
          Number.isFinite(item.jumlah) &&
          "satuan" in item &&
          typeof item.satuan === "string" &&
          "hargaSatuan" in item &&
          typeof item.hargaSatuan === "number" &&
          Number.isFinite(item.hargaSatuan) &&
          "subtotal" in item &&
          typeof item.subtotal === "number" &&
          Number.isFinite(item.subtotal),
      );
    const obat = r.obat;
    const suntik = r.suntik;
    if (
      r.versi !== 1 ||
      !biayaValid ||
      !daftarValid(obat) ||
      !daftarValid(suntik) ||
      typeof r.totalObat !== "number" ||
      !Number.isFinite(r.totalObat) ||
      typeof r.totalSuntik !== "number" ||
      !Number.isFinite(r.totalSuntik) ||
      typeof r.total !== "number" ||
      !Number.isFinite(r.total)
    ) {
      return null;
    }
    return {
      versi: 1,
      biayaPemeriksaan: {
        idLayanan: Number(b.idLayanan),
        namaLayanan: String(b.namaLayanan),
        tarif: Number(b.tarif),
        diskonPersen: Number(b.diskonPersen),
        biaya: Number(b.biaya),
      },
      obat,
      suntik,
      totalObat: Number(r.totalObat),
      totalSuntik: Number(r.totalSuntik),
      total: Number(r.total),
      resepLama: typeof r.resepLama === "string" ? r.resepLama : null,
    };
  } catch {
    return null;
  }
}

function tampilkanResep(value: unknown): string | null {
  if (typeof value !== "string" || !value) return null;
  const rincian = parseRincianBiaya(value);
  if (!rincian) return value;
  const rupiah = (amount: number) =>
    `Rp ${new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 }).format(amount)}`;
  const lines = [
    `Biaya pemeriksaan (${rincian.biayaPemeriksaan.namaLayanan}): ${rupiah(rincian.biayaPemeriksaan.biaya)}`,
  ];
  if (rincian.resepLama) lines.push(`Resep sebelumnya: ${rincian.resepLama}`);
  for (const [label, items] of [
    ["Obat", rincian.obat],
    ["Suntik", rincian.suntik],
  ] as const) {
    for (const item of items) {
      lines.push(
        `${label}: ${item.nama} — ${item.jumlah} ${item.satuan} × ${rupiah(item.hargaSatuan)} = ${rupiah(item.subtotal)}`,
      );
    }
  }
  lines.push(
    `Total obat: ${rupiah(rincian.totalObat)}`,
    `Total suntik: ${rupiah(rincian.totalSuntik)}`,
    `Total biaya: ${rupiah(rincian.total)}`,
  );
  return lines.join("\n");
}

const SQL_LAYANAN_PEMERIKSAAN = `
  SELECT idLayanan, namaLayanan, tarif, diskonAktif, nilaiDiskon,
         DATE_FORMAT(mulaiDiskon, '%Y-%m-%d') AS mulaiDiskon,
         DATE_FORMAT(selesaiDiskon, '%Y-%m-%d') AS selesaiDiskon
    FROM layanan
   WHERE idPoli = ? AND statusAktif = TRUE
     AND LOWER(kategori) IN ('pemeriksaan', 'konsultasi')
   ORDER BY CASE LOWER(kategori) WHEN 'pemeriksaan' THEN 0 ELSE 1 END, idLayanan
   LIMIT 1`;

function hitungBiayaPemeriksaan(r: RowDataPacket, tanggal: string): BiayaPemeriksaan {
  const tarif = Number(r.tarif);
  const diskonAktif =
    Boolean(r.diskonAktif) &&
    Number(r.nilaiDiskon) > 0 &&
    (!r.mulaiDiskon || String(r.mulaiDiskon) <= tanggal) &&
    (!r.selesaiDiskon || String(r.selesaiDiskon) >= tanggal);
  const diskonPersen = diskonAktif ? Number(r.nilaiDiskon) : 0;
  return {
    idLayanan: Number(r.idLayanan),
    namaLayanan: String(r.namaLayanan),
    tarif,
    diskonPersen,
    biaya: bulatkanUang(tarif * (1 - diskonPersen / 100)),
  };
}

export async function getBiayaPemeriksaanService(
  idPoli: number,
  tanggal: string,
): Promise<ActionResponse<BiayaPemeriksaan | null>> {
  try {
    const [rows] = await getMySQLPool().execute<RowDataPacket[]>(
      SQL_LAYANAN_PEMERIKSAAN,
      [idPoli],
    );
    if (!rows[0]) {
      return { success: true, data: null };
    }
    return { success: true, data: hitungBiayaPemeriksaan(rows[0], tanggal) };
  } catch (err) {
    return handleServiceError(err, "Terjadi kesalahan saat mengambil tarif pemeriksaan.");
  }
}

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
  if (msg.includes("uk_pasien_nik")) {
    return "NIK sudah terdaftar, periksa data pasien yang sudah ada";
  }
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

const nilaiKolomPasien = (k: (typeof KOLOM_PASIEN)[number], d: PasienInput) => {
  if (k === "noBpjs" && d.jenisPenjamin !== "BPJS Kesehatan (JKN)") return null;
  if (k === "noHp" && d.noHp) {
    const angka = d.noHp.replace(/\D/g, "");
    if (angka.startsWith("62")) return `+${angka}`;
    return `+62${angka.startsWith("0") ? angka.slice(1) : angka}`;
  }
  return d[k];
};
const nilaiPasien = (d: PasienInput) => KOLOM_PASIEN.map((k) => nilaiKolomPasien(k, d));

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

export const getPasienByIdUntukDokterService = async (
  idPasien: number,
  idDokter: number,
): Promise<ActionResponse<Pasien>> => {
  try {
    const [rows] = await getMySQLPool().execute<RowDataPacket[]>(
      `SELECT p.*
         FROM pasien p
        WHERE p.idPasien = ?
          AND EXISTS (
            SELECT 1 FROM kunjungan kj
             WHERE kj.idPasien = p.idPasien AND kj.idDokter = ?
          )
        LIMIT 1`,
      [idPasien, idDokter],
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

const KOLOM_PASIEN_TANPA_NIK = KOLOM_PASIEN.filter((kolom) => kolom !== "NIK");

/** Ubah pasien. No. RM tidak pernah ikut diubah (juga dikunci trigger DB). */
export const updatePasienService = async (
  idPasien: number,
  d: PasienInput,
): Promise<ActionResponse> => {
  try {
    const [res] = await getMySQLPool().execute<ResultSetHeader>(
      `UPDATE pasien SET ${KOLOM_PASIEN_TANPA_NIK.map((k) => `${k} = ?`).join(", ")} WHERE idPasien = ?`,
      [
        ...KOLOM_PASIEN_TANPA_NIK.map((k) => nilaiKolomPasien(k, d)),
        idPasien,
      ],
    );
    if (res.affectedRows === 0) {
      const [rows] = await getMySQLPool().execute<RowDataPacket[]>(
        "SELECT idPasien FROM pasien WHERE idPasien = ? LIMIT 1",
        [idPasien],
      );
      if (!rows[0]) return { success: false, error: "Pasien tidak ditemukan." };
    }
    return { success: true, message: "Data pasien berhasil diperbarui." };
  } catch (err) {
    const dup = duplikatPasien(err);
    if (dup) return { success: false, error: dup };
    return handleServiceError(err, "Terjadi kesalahan saat memperbarui pasien.");
  }
};

export const deletePasienService = async (idPasien: number): Promise<ActionResponse> => {
  try {
    const hasil = await mysqlTransaction(async (conn) => {
      const [pasien] = await conn.execute<RowDataPacket[]>(
        "SELECT idPasien FROM pasien WHERE idPasien = ? FOR UPDATE",
        [idPasien],
      );
      if (!pasien[0]) return "tidak-ditemukan";

      const [riwayat] = await conn.execute<RowDataPacket[]>(
        `SELECT
           EXISTS (SELECT 1 FROM kunjungan WHERE idPasien = ?) AS adaKunjungan,
           EXISTS (
             SELECT 1 FROM rekam_medis rm
             JOIN kunjungan kj ON kj.idKunjungan = rm.idKunjungan
              WHERE kj.idPasien = ?
           ) AS adaRekamMedis,
           EXISTS (
             SELECT 1 FROM invoice i
             JOIN kunjungan kj ON kj.idKunjungan = i.idKunjungan
              WHERE kj.idPasien = ?
           ) AS adaInvoice`,
        [idPasien, idPasien, idPasien],
      );
      if (riwayat[0].adaKunjungan || riwayat[0].adaRekamMedis || riwayat[0].adaInvoice) {
        return "memiliki-riwayat";
      }

      await conn.execute<ResultSetHeader>("DELETE FROM pasien WHERE idPasien = ?", [idPasien]);
      return "terhapus";
    });
    if (hasil === "tidak-ditemukan") {
      return { success: false, error: "Pasien tidak ditemukan." };
    }
    if (hasil === "memiliki-riwayat") {
      return { success: false, error: "Pasien memiliki riwayat kunjungan, tidak dapat dihapus" };
    }
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
  idDokter?: number | null;
  denganDiagnosa: boolean;
}): Promise<ActionResponse<PasienRingkas[]>> => {
  try {
    const where: string[] = [];
    const whereValues: unknown[] = [];
    if (opts.idDokter != null) {
      where.push(`EXISTS (
        SELECT 1 FROM kunjungan k2
         WHERE k2.idPasien = p.idPasien AND k2.idDokter = ?
      )`);
      whereValues.push(opts.idDokter);
    }
    if (opts.idKaryawan !== null) {
      where.push(`EXISTS (SELECT 1 FROM kunjungan k2 JOIN rekam_medis r2 ON r2.idKunjungan = k2.idKunjungan
                           WHERE k2.idPasien = p.idPasien AND (r2.idDokter = ? OR r2.idPerawat = ?))`);
      whereValues.push(opts.idKaryawan, opts.idKaryawan);
    }
    const q = opts.q.trim();
    if (q) {
      where.push("(p.namaLengkap LIKE ? OR p.NIK LIKE ? OR p.noBpjs LIKE ? OR p.NoRM LIKE ?)");
      whereValues.push(...Array(4).fill(`%${q}%`));
    }
    const filterDokterTerakhir = opts.idDokter == null ? "" : "AND kj.idDokter = ?";
    const values: unknown[] = [
      ...(opts.idDokter == null ? [] : [opts.idDokter]),
      ...whereValues,
    ];

    const [rows] = await getMySQLPool().query<RowDataPacket[]>(
      `SELECT p.idPasien, p.NoRM, p.namaLengkap, p.NIK, p.noBpjs,
              terakhir.tglKunjungan AS pemeriksaanTerakhir, terakhir_rm.diagnosa
         FROM pasien p
         LEFT JOIN kunjungan terakhir
           ON terakhir.idKunjungan = (
           SELECT kj.idKunjungan
             FROM kunjungan kj
             JOIN rekam_medis rm ON rm.idKunjungan = kj.idKunjungan
            WHERE kj.idPasien = p.idPasien ${filterDokterTerakhir}
            ORDER BY kj.tglKunjungan DESC, kj.jamKunjungan DESC, kj.idKunjungan DESC
            LIMIT 1
         )
         LEFT JOIN rekam_medis terakhir_rm ON terakhir_rm.idKunjungan = terakhir.idKunjungan
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
    const detail =
      err && typeof err === "object" && "code" in err && typeof err.code === "string"
        ? err.code
        : err instanceof Error
          ? err.name
          : "Kesalahan tidak diketahui";
    console.error("[getPasienListService] Gagal mengambil daftar pasien.", detail);
    return { success: false, error: "Terjadi kesalahan saat mengambil daftar pasien." };
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
  idDokter?: number | null,
): Promise<ActionResponse<RiwayatPenanganan[]>> => {
  try {
    const [rows] = await getMySQLPool().execute<RowDataPacket[]>(
      `SELECT kj.idKunjungan, kj.kodeKunjungan, kj.tglKunjungan, kj.jamKunjungan, kj.status,
              po.namaPoli, ${LAYANAN_KUNJUNGAN_SQL} AS namaLayanan,
              d.namaLengkap AS namaDokter, pr.namaLengkap AS namaPerawat, rm.diagnosa,
              rm.tekananDarah, rm.suhu, rm.nadi, rm.lajuNapas, rm.keluhan,
              rm.resepObat, rm.catatanDokter
         FROM kunjungan kj
         JOIN poli po ON po.idPoli = kj.idPoli
         LEFT JOIN rekam_medis rm ON rm.idKunjungan = kj.idKunjungan
         LEFT JOIN karyawan d ON d.idKaryawan = COALESCE(rm.idDokter, kj.idDokter)
         LEFT JOIN karyawan pr ON pr.idKaryawan = COALESCE(rm.idPerawat, kj.idPerawat)
        WHERE kj.idPasien = ? ${idDokter == null ? "" : "AND kj.idDokter = ?"}
        ORDER BY kj.tglKunjungan DESC, kj.jamKunjungan DESC`,
      idDokter == null ? [idPasien] : [idPasien, idDokter],
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
        tekananDarah: r.tekananDarah ?? null,
        suhu: r.suhu == null ? null : Number(r.suhu),
        nadi: r.nadi == null ? null : Number(r.nadi),
        lajuNapas: r.lajuNapas == null ? null : Number(r.lajuNapas),
        keluhan: r.keluhan ?? null,
        resepObat: tampilkanResep(r.resepObat),
        catatanDokter: r.catatanDokter ?? null,
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
  rincianBiaya: RincianBiayaDiagnosa | null;
  resepLama: string | null;
}

export const getPemeriksaanService = async (
  idKunjungan: number,
): Promise<ActionResponse<PemeriksaanTersimpan>> => {
  try {
    const pool = getMySQLPool();
    const [[rm], [items], [klaim]] = await Promise.all([
      pool.execute<RowDataPacket[]>(
        `SELECT rm.idPerawat, pr.namaLengkap AS namaPerawat, rm.tekananDarah, rm.suhu, rm.nadi,
                rm.lajuNapas, rm.beratBadan, rm.tinggiBadan, rm.keluhan, rm.diagnosa, rm.catatanDokter,
                rm.resepObat
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
    const rincianBiaya = parseRincianBiaya(rm[0]?.resepObat);
    return {
      success: true,
      data: {
        ada: Boolean(rm[0]),
        idPerawat: rm[0]?.idPerawat ?? null,
        namaPerawat: rm[0]?.namaPerawat ?? null,
        nilai: rm[0] ? { ...rm[0] } : {},
        layanan: items.map((i) => i.idLayanan),
        terkunci: Number(klaim[0].jumlah) > 0,
        rincianBiaya,
        resepLama: rincianBiaya
          ? rincianBiaya.resepLama ?? null
          : typeof rm[0]?.resepObat === "string"
            ? rm[0].resepObat
            : null,
      },
    };
  } catch (err) {
    return handleServiceError(err, "Terjadi kesalahan saat mengambil data pemeriksaan.");
  }
};

/** Kunci kunjungan, pastikan belum dibatalkan & belum ada jasa yang diklaim */
async function kunciKunjungan(conn: PoolConnection, idKunjungan: number) {
  const [kj] = await conn.execute<RowDataPacket[]>(
    "SELECT idDokter, idPerawat, status, idPoli, tglKunjungan FROM kunjungan WHERE idKunjungan = ? FOR UPDATE",
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
  return kj[0] as {
    idDokter: number;
    idPerawat: number | null;
    status: string;
    idPoli: number;
    tglKunjungan: string;
  };
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
        "SELECT idRekamMedis, resepObat FROM rekam_medis WHERE idKunjungan = ? FOR UPDATE",
        [idKunjungan],
      );
      if (!rm[0]) {
        throw new RekapError("Tab Pemeriksaan (tanda vital & keluhan) belum diisi.");
      }

      const [layananPemeriksaan] = await conn.execute<RowDataPacket[]>(
        SQL_LAYANAN_PEMERIKSAAN,
        [kj.idPoli],
      );
      if (!layananPemeriksaan[0]) {
        throw new RekapError("Tarif pemeriksaan aktif untuk poli kunjungan belum tersedia.");
      }
      const tanggal = tgl(kj.tglKunjungan) ?? "";
      const biayaPemeriksaan = hitungBiayaPemeriksaan(layananPemeriksaan[0], tanggal);
      const obat = hitungItemDiagnosa(d.obat);
      const suntik = hitungItemDiagnosa(d.suntik);
      const totalObat = bulatkanUang(obat.reduce((total, item) => total + item.subtotal, 0));
      const totalSuntik = bulatkanUang(suntik.reduce((total, item) => total + item.subtotal, 0));
      const rincianSebelumnya = parseRincianBiaya(rm[0].resepObat);
      const rincianBiaya: RincianBiayaDiagnosa = {
        versi: 1,
        biayaPemeriksaan,
        obat,
        suntik,
        totalObat,
        totalSuntik,
        total: bulatkanUang(biayaPemeriksaan.biaya + totalObat + totalSuntik),
        resepLama: rincianSebelumnya
          ? rincianSebelumnya.resepLama ?? null
          : typeof rm[0].resepObat === "string"
            ? rm[0].resepObat
            : null,
      };

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
        `UPDATE rekam_medis SET diagnosa = ?, catatanDokter = ?, resepObat = ?
          WHERE idRekamMedis = ?`,
        [
          d.diagnosa,
          d.catatanDokter,
          `${RESEP_BIAYA_PREFIX}${JSON.stringify(rincianBiaya)}`,
          rm[0].idRekamMedis,
        ],
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
