import { ResultSetHeader, RowDataPacket } from "mysql2";
import { getMySQLPool } from "@/database/mysql-client";
import { ActionResponse } from "@/types/action";
import type {
  JabatanJasa,
  JasaPelayananData,
  PerolehanJasa,
  RingkasanPerolehan,
} from "@/types/jasa";
import { handleServiceError } from "@/utils/error";
import { kategoriJabatanJasa } from "@/utils/format";
import { mysqlTransaction } from "@/utils/mysql";
import { BIAYA_JOIN, BIAYA_SQL, hitungJasa, TARIF_BERLAKU_SQL } from "./tarif-jasa.service";

/** Karyawan yang terhubung dengan akun login */
export interface KaryawanJasa {
  idKaryawan: number;
  namaLengkap: string;
  jabatan: JabatanJasa | null;
}

class KlaimError extends Error {}

export const getKaryawanByUserService = async (
  idUser: string,
): Promise<ActionResponse<KaryawanJasa>> => {
  try {
    const [rows] = await getMySQLPool().execute<RowDataPacket[]>({
      sql: "SELECT idKaryawan, namaLengkap, jenisKaryawan FROM karyawan WHERE id_user = ? LIMIT 1",
      values: [idUser],
    });
    if (!rows[0]) {
      return { success: false, error: "Akun Anda belum terhubung dengan data karyawan." };
    }
    return {
      success: true,
      data: {
        idKaryawan: rows[0].idKaryawan,
        namaLengkap: rows[0].namaLengkap,
        jabatan: kategoriJabatanJasa(rows[0].jenisKaryawan),
      },
    };
  } catch (err) {
    return handleServiceError(err, "Terjadi kesalahan saat mengambil data karyawan.");
  }
};

/** 12 bulan terakhir (terbaru dulu), format YYYY-MM */
export function daftarBulanTerakhir(now = new Date(), jumlah = 12): string[] {
  return Array.from({ length: jumlah }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
}

function rentangBulan(bulan: string): [string, string] {
  const [y, m] = bulan.split("-").map(Number);
  const next = new Date(y, m, 1); // bulan berikutnya (m sudah 1-based)
  return [
    `${bulan}-01`,
    `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-01`,
  ];
}

/**
 * Query inti perolehan, satu baris per TINDAKAN (kunjungan_layanan). Karyawan menerima jasa sebagai:
 *   - dokter  : dokter penanggung jawab rekam medis, setelah diagnosa diisi → persentase "dokter"
 *   - perawat : perawat yang mengisi pemeriksaan → persentase "perawat"
 * Persentase = tarif yang berlaku pada tanggal kunjungan, per layanan tindakan.
 * Klaim yang dicek hanya klaim milik karyawan ini.
 *
 * Parameter berurutan: [idKaryawan (dokter), idKaryawan (perawat), idKaryawan (klaim), ...filter]
 */
const perolehanSql = (filter: string) => `
  SELECT x.*, ak.biayaTindakan AS klaimBiaya, ak.persentase AS klaimPersen,
         ak.nominal AS klaimNominal, ak.status AS statusKlaim
    FROM (
      SELECT kl.idKunjunganLayanan AS idItem, 'dokter' AS peran, kj.tglKunjungan, l.namaLayanan,
             ${BIAYA_SQL} AS biaya, ${TARIF_BERLAKU_SQL("dokter")} AS persentase
        FROM kunjungan_layanan kl
        JOIN kunjungan kj ON kj.idKunjungan = kl.idKunjungan
        JOIN rekam_medis rm ON rm.idKunjungan = kj.idKunjungan
        JOIN layanan l ON l.idLayanan = kl.idLayanan
        ${BIAYA_JOIN}
       WHERE rm.idDokter = ? AND rm.diagnosa IS NOT NULL
      UNION ALL
      SELECT kl.idKunjunganLayanan AS idItem, 'perawat' AS peran, kj.tglKunjungan, l.namaLayanan,
             ${BIAYA_SQL} AS biaya, ${TARIF_BERLAKU_SQL("perawat")} AS persentase
        FROM kunjungan_layanan kl
        JOIN kunjungan kj ON kj.idKunjungan = kl.idKunjungan
        JOIN rekam_medis rm ON rm.idKunjungan = kj.idKunjungan
        JOIN layanan l ON l.idLayanan = kl.idLayanan
        ${BIAYA_JOIN}
       WHERE rm.idPerawat = ?
    ) x
    LEFT JOIN (
      SELECT kd.idKunjunganLayanan, kd.biayaTindakan, kd.persentase, kd.nominal, k.status
        FROM klaim_jasa_detail kd
        JOIN klaim_jasa k ON k.idKlaim = kd.idKlaim
       WHERE k.status <> 'ditolak' AND k.idKaryawan = ?
    ) ak ON ak.idKunjunganLayanan = x.idItem
   WHERE ${filter}`;

/** null = layanan belum punya tarif jasa sama sekali (tidak ditampilkan & tidak bisa diklaim) */
function toPerolehan(r: RowDataPacket): PerolehanJasa | null {
  const tanggal = String(r.tglKunjungan).slice(0, 10);
  if (r.statusKlaim) {
    return {
      idItem: r.idItem,
      peran: r.peran,
      tanggal,
      namaLayanan: r.namaLayanan,
      biaya: Number(r.klaimBiaya),
      persentase: Number(r.klaimPersen),
      nominal: Number(r.klaimNominal),
      status: "diklaim",
      statusKlaim: r.statusKlaim,
    };
  }
  if (r.persentase === null) return null;
  const biaya = Number(r.biaya);
  const persentase = Number(r.persentase);
  return {
    idItem: r.idItem,
    peran: r.peran,
    tanggal,
    namaLayanan: r.namaLayanan,
    biaya,
    persentase,
    nominal: hitungJasa(biaya, persentase),
    status: "belum_diklaim",
    statusKlaim: null,
  };
}

export const getPerolehanJasaService = async (
  karyawan: KaryawanJasa,
  bulan: string,
): Promise<ActionResponse<JasaPelayananData>> => {
  try {
    const [mulai, selesai] = rentangBulan(bulan);
    const id = karyawan.idKaryawan;
    const [rows] = await getMySQLPool().query<RowDataPacket[]>(
      `${perolehanSql("x.tglKunjungan >= ? AND x.tglKunjungan < ?")}
        ORDER BY x.tglKunjungan ASC, x.idItem ASC`,
      [id, id, id, mulai, selesai],
    );

    const items = rows.map(toPerolehan).filter((it): it is PerolehanJasa => it !== null);
    const ringkasan: RingkasanPerolehan = {
      total: 0,
      jumlahDihitung: 0,
      belumDiklaim: 0,
      jumlahBelumDiklaim: 0,
      sudahDiklaim: 0,
      jumlahSudahDiklaim: 0,
    };
    for (const it of items) {
      ringkasan.total += it.nominal;
      ringkasan.jumlahDihitung++;
      if (it.status === "diklaim") {
        ringkasan.sudahDiklaim += it.nominal;
        ringkasan.jumlahSudahDiklaim++;
      } else {
        ringkasan.belumDiklaim += it.nominal;
        ringkasan.jumlahBelumDiklaim++;
      }
    }

    return {
      success: true,
      data: {
        bulan,
        daftarBulan: daftarBulanTerakhir(),
        namaKaryawan: karyawan.namaLengkap,
        jabatan: karyawan.jabatan,
        items,
        ringkasan,
      },
    };
  } catch (err) {
    return handleServiceError(err, "Terjadi kesalahan saat menghitung jasa pelayanan.");
  }
};

/**
 * Ajukan klaim pencairan. Nominal SELALU dihitung ulang di server
 * (tidak memakai angka dari browser) lalu disimpan sebagai snapshot.
 */
export const klaimJasaService = async (
  karyawan: KaryawanJasa,
  idItemList: number[],
): Promise<ActionResponse<{ idKlaim: number; total: number; jumlah: number }>> => {
  try {
    const ids = [...new Set(idItemList)];

    const result = await mysqlTransaction(async (conn) => {
      // Kunci baris karyawan: mencegah dua klaim bersamaan untuk tindakan yang sama
      await conn.execute({
        sql: "SELECT idKaryawan FROM karyawan WHERE idKaryawan = ? FOR UPDATE",
        values: [karyawan.idKaryawan],
      });

      const id = karyawan.idKaryawan;
      const [rows] = await conn.query<RowDataPacket[]>(perolehanSql("x.idItem IN (?)"), [
        id,
        id,
        id,
        ids,
      ]);
      if (rows.length !== ids.length) {
        throw new KlaimError("Sebagian tindakan tidak ditemukan atau bukan tindakan Anda.");
      }

      const hasil = rows.map(toPerolehan);
      if (hasil.some((it) => it === null)) {
        throw new KlaimError(
          "Sebagian tindakan belum memiliki tarif jasa sehingga belum bisa diklaim.",
        );
      }
      const items = hasil as PerolehanJasa[];
      if (items.some((it) => it.status === "diklaim")) {
        throw new KlaimError("Sebagian tindakan sudah pernah diklaim. Muat ulang halaman.");
      }

      const total = items.reduce((sum, it) => sum + it.nominal, 0);
      const [header] = await conn.execute<ResultSetHeader>({
        sql: "INSERT INTO klaim_jasa (idKaryawan, totalNominal, status) VALUES (?, ?, 'diajukan')",
        values: [karyawan.idKaryawan, total],
      });
      await conn.query(
        `INSERT INTO klaim_jasa_detail (idKlaim, idKunjunganLayanan, biayaTindakan, persentase, nominal)
         VALUES ?`,
        [items.map((it) => [header.insertId, it.idItem, it.biaya, it.persentase, it.nominal])],
      );
      return { idKlaim: header.insertId, total, jumlah: items.length };
    });

    return {
      success: true,
      data: result,
      message: `Klaim ${result.jumlah} perolehan berhasil diajukan.`,
    };
  } catch (err) {
    if (err instanceof KlaimError) return { success: false, error: err.message };
    return handleServiceError(err, "Terjadi kesalahan saat mengajukan klaim.");
  }
};
